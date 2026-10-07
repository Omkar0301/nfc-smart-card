import {
  CardStatus,
  ErrorCode,
  type PublicProfileResponse,
  type UserProfileResponse,
} from '@nfc-card/shared';
import { logger } from '../lib/logger.js';
import { revalidateProfileTag } from '../lib/cacheInvalidation.js';
import { profileRepository } from '../repositories/profile.repository.js';
import type { UpdateProfileInput } from '../validators/profile.validator.js';

export type ServiceResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      status: number;
      code: ErrorCode;
      message: string;
      details?: Record<string, unknown>;
    };

interface FieldSchemaItem {
  key: string;
  label: string;
  type: string;
  required: boolean;
  defaultVisible: boolean;
  placeholder?: string;
  options?: string[];
  helpText?: string;
}

export const profileService = {
  async getProfile(userId: string): Promise<ServiceResult<UserProfileResponse>> {
    // 1. Find active card assignment for the authenticated user
    const assignment = await profileRepository.findActiveAssignmentByUserId(userId);
    if (!assignment || !assignment.card) {
      return {
        ok: false,
        status: 404,
        code: ErrorCode.NO_ACTIVE_CARD,
        message: 'No active card assigned to your account.',
      };
    }

    const { card } = assignment;
    const { cardType } = card;

    // 2. Find or create profile row
    let profile = await profileRepository.findProfileByUserIdAndCardTypeId(userId, card.cardTypeId);

    if (!profile) {
      profile = await profileRepository.createDraftProfile({
        userId,
        cardTypeId: card.cardTypeId,
        data: {},
        fieldVisibility: {},
        status: 'draft',
      });
    }

    // 3. Initialize fieldVisibility from fieldSchema defaults if empty
    const fieldSchema = (cardType.fieldSchema as unknown as FieldSchemaItem[]) || [];
    let visibility = (profile.fieldVisibility as Record<string, boolean>) || {};

    if (!visibility || Object.keys(visibility).length === 0) {
      const initialVisibility: Record<string, boolean> = {};
      for (const item of fieldSchema) {
        initialVisibility[item.key] = item.defaultVisible ?? true;
      }

      profile = await profileRepository.updateProfile(profile.id, {
        fieldVisibility: initialVisibility,
      });
      visibility = initialVisibility;
    }

    return {
      ok: true,
      data: {
        profile: {
          id: profile.id,
          userId: profile.userId,
          cardTypeId: profile.cardTypeId,
          templateId: profile.templateId,
          data: (profile.data as Record<string, any>) || {},
          fieldVisibility: visibility,
          status: profile.status as 'draft' | 'published',
          cardType: {
            id: cardType.id,
            name: cardType.name,
            slug: cardType.slug,
            fieldSchema,
          },
          card: {
            id: card.id,
            cardNumber: card.cardNumber,
            publicToken: card.publicToken,
            status: card.status as unknown as CardStatus,
          },
        },
      },
    };
  },

  async saveProfile(
    userId: string,
    input: UpdateProfileInput
  ): Promise<ServiceResult<UserProfileResponse>> {
    // 1. Find active card assignment
    const assignment = await profileRepository.findActiveAssignmentByUserId(userId);
    if (!assignment || !assignment.card) {
      return {
        ok: false,
        status: 404,
        code: ErrorCode.NO_ACTIVE_CARD,
        message: 'No active card assigned to your account.',
      };
    }

    const { card } = assignment;
    const { cardType } = card;
    const fieldSchema = (cardType.fieldSchema as unknown as FieldSchemaItem[]) || [];
    const validKeys = new Set(fieldSchema.map((f) => f.key));

    // 2. Find or create profile row
    let existingProfile = await profileRepository.findProfileByUserIdAndCardTypeId(
      userId,
      card.cardTypeId
    );

    if (!existingProfile) {
      existingProfile = await profileRepository.createDraftProfile({
        userId,
        cardTypeId: card.cardTypeId,
        data: {},
        fieldVisibility: {},
        status: 'draft',
      });
    }

    // 3. Strip unknown keys and merge profile data
    const currentData = (existingProfile.data as Record<string, unknown>) || {};
    const sanitizedIncomingData: Record<string, unknown> = {};

    if (input.data) {
      for (const [key, value] of Object.entries(input.data)) {
        if (validKeys.has(key)) {
          sanitizedIncomingData[key] = value;
        }
      }
    }

    const mergedData = { ...currentData, ...sanitizedIncomingData };

    // 4. Strip unknown keys and merge fieldVisibility
    const currentVisibility = (existingProfile.fieldVisibility as Record<string, boolean>) || {};
    const sanitizedIncomingVisibility: Record<string, boolean> = {};

    if (input.fieldVisibility) {
      for (const [key, value] of Object.entries(input.fieldVisibility)) {
        if (validKeys.has(key)) {
          sanitizedIncomingVisibility[key] = Boolean(value);
        }
      }
    }

    const mergedVisibility = { ...currentVisibility, ...sanitizedIncomingVisibility };

    let updatedProfile = existingProfile;

    // 5. Handle transitions based on publish flag
    if (input.publish === true) {
      // Validate card lifecycle constraints
      if (card.status === CardStatus.PAUSED) {
        return {
          ok: false,
          status: 409,
          code: ErrorCode.CARD_PAUSED,
          message: 'Card is currently paused. Please resume your card before publishing.',
        };
      }

      if (card.status === CardStatus.SUSPENDED) {
        return {
          ok: false,
          status: 409,
          code: ErrorCode.CARD_SUSPENDED,
          message: 'Card is suspended by administration.',
        };
      }

      if (card.status === CardStatus.DEACTIVATED) {
        return {
          ok: false,
          status: 400,
          code: ErrorCode.CARD_DEACTIVATED_PERMANENT,
          message: 'This card has been deactivated permanently.',
        };
      }

      // Validate required fields
      for (const field of fieldSchema) {
        if (field.required) {
          const val = mergedData[field.key];
          const isMissing =
            val === undefined ||
            val === null ||
            (typeof val === 'string' && val.trim() === '') ||
            (Array.isArray(val) && val.length === 0);

          if (isMissing) {
            return {
              ok: false,
              status: 400,
              code: ErrorCode.REQUIRED_FIELD_MISSING,
              message: `Required field '${field.label || field.key}' is missing.`,
              details: { field: field.key },
            };
          }
        }
      }

      const shouldActivateCard = card.status === CardStatus.ASSIGNED;

      const txResult = await profileRepository.saveAndPublishTransaction({
        profileId: existingProfile.id,
        cardId: card.id,
        data: mergedData,
        fieldVisibility: mergedVisibility,
        templateId: input.templateId,
        shouldActivateCard,
      });

      updatedProfile = txResult.profile;
      if (txResult.card) {
        card.status = txResult.card.status;
      }

      logger.info(
        { profileId: updatedProfile.id, userId, cardId: card.id },
        '[profile] profile published successfully'
      );
    } else if (input.publish === false) {
      if (card.status === CardStatus.SUSPENDED) {
        return {
          ok: false,
          status: 409,
          code: ErrorCode.CARD_SUSPENDED,
          message: 'Card is suspended by administration.',
        };
      }

      const shouldAssignCard = card.status === CardStatus.ACTIVE;

      const txResult = await profileRepository.saveAndUnpublishTransaction({
        profileId: existingProfile.id,
        cardId: card.id,
        data: mergedData,
        fieldVisibility: mergedVisibility,
        templateId: input.templateId,
        shouldAssignCard,
      });

      updatedProfile = txResult.profile;
      if (txResult.card) {
        card.status = txResult.card.status;
      }

      logger.info(
        { profileId: updatedProfile.id, userId, cardId: card.id },
        '[profile] profile unpublished (set to draft)'
      );
    } else {
      // Incremental save (draft or live published update)
      if (existingProfile.status === 'published') {
        // Ensure required fields are not wiped
        for (const field of fieldSchema) {
          if (field.required) {
            const val = mergedData[field.key];
            const isMissing =
              val === undefined ||
              val === null ||
              (typeof val === 'string' && val.trim() === '') ||
              (Array.isArray(val) && val.length === 0);

            if (isMissing) {
              return {
                ok: false,
                status: 400,
                code: ErrorCode.REQUIRED_FIELD_MISSING,
                message: `Required field '${field.label || field.key}' cannot be left blank.`,
                details: { field: field.key },
              };
            }
          }
        }
      }

      updatedProfile = await profileRepository.updateProfile(existingProfile.id, {
        data: mergedData,
        fieldVisibility: mergedVisibility,
        templateId: input.templateId,
      });

      logger.info(
        { profileId: updatedProfile.id, userId, cardId: card.id },
        '[profile] profile updated successfully'
      );
    }

    // Cache invalidation (skills.md): profile save, visibility toggle, and
    // template switch all change what the cached public page renders.
    void revalidateProfileTag(card.publicToken);

    return {
      ok: true,
      data: {
        profile: {
          id: updatedProfile.id,
          userId: updatedProfile.userId,
          cardTypeId: updatedProfile.cardTypeId,
          templateId: updatedProfile.templateId,
          data: (updatedProfile.data as Record<string, any>) || {},
          fieldVisibility: (updatedProfile.fieldVisibility as Record<string, boolean>) || {},
          status: updatedProfile.status as 'draft' | 'published',
          cardType: {
            id: cardType.id,
            name: cardType.name,
            slug: cardType.slug,
            fieldSchema,
          },
          card: {
            id: card.id,
            cardNumber: card.cardNumber,
            publicToken: card.publicToken,
            status: card.status as unknown as CardStatus,
          },
        },
      },
    };
  },

  async getPublicProfile(token: string): Promise<ServiceResult<PublicProfileResponse>> {
    const card = await profileRepository.findByPublicTokenWithActiveProfile(token);
    if (!card) {
      return {
        ok: false,
        status: 404,
        code: ErrorCode.CARD_NOT_FOUND,
        message: 'Card not found.',
      };
    }

    const { cardType } = card;

    if (card.status === CardStatus.AVAILABLE) {
      return {
        ok: false,
        status: 404,
        code: ErrorCode.CARD_NOT_AVAILABLE,
        message: 'This card is not yet activated.',
      };
    }

    // If card is paused, suspended, or deactivated
    if (
      card.status === CardStatus.PAUSED ||
      card.status === CardStatus.SUSPENDED ||
      card.status === CardStatus.DEACTIVATED
    ) {
      return {
        ok: true,
        data: {
          card: {
            cardNumber: card.cardNumber,
            status: card.status as unknown as CardStatus,
            publicToken: card.publicToken,
          },
          cardType: {
            slug: cardType.slug,
            name: cardType.name,
          },
        },
      };
    }

    const activeAssignment = card.assignments[0];
    if (!activeAssignment || !activeAssignment.user) {
      return {
        ok: true,
        data: {
          card: {
            cardNumber: card.cardNumber,
            status: card.status as unknown as CardStatus,
            publicToken: card.publicToken,
          },
          cardType: {
            slug: cardType.slug,
            name: cardType.name,
          },
          profileStatus: 'draft',
        },
      };
    }

    const profile = activeAssignment.user.profiles.find((p) => p.cardTypeId === card.cardTypeId);

    if (!profile || profile.status !== 'published') {
      return {
        ok: true,
        data: {
          card: {
            cardNumber: card.cardNumber,
            status: card.status as unknown as CardStatus,
            publicToken: card.publicToken,
          },
          cardType: {
            slug: cardType.slug,
            name: cardType.name,
          },
          profileStatus: 'draft',
        },
      };
    }

    // SERVER-SIDE VISIBILITY ENFORCEMENT
    // Never send unfiltered data or hidden fields to the public
    const fieldSchema = (cardType.fieldSchema as unknown as FieldSchemaItem[]) || [];
    const visibility = (profile.fieldVisibility as Record<string, boolean>) || {};
    const profileData = (profile.data as Record<string, unknown>) || {};
    const publicData: Record<string, unknown> = {};

    for (const field of fieldSchema) {
      const isVisible = field.key in visibility ? visibility[field.key] : field.defaultVisible;

      if (isVisible && profileData[field.key] !== undefined && profileData[field.key] !== null) {
        publicData[field.key] = profileData[field.key];
      }
    }

    return {
      ok: true,
      data: {
        card: {
          cardNumber: card.cardNumber,
          status: card.status as unknown as CardStatus,
          publicToken: card.publicToken,
        },
        cardType: {
          slug: cardType.slug,
          name: cardType.name,
        },
        profile: {
          id: profile.id,
          data: publicData,
          templateId: profile.templateId,
          status: profile.status,
        },
      },
    };
  },
};
