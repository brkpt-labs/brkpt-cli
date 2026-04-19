import type { Registry } from '../../../src/commands/auth/utils/fetch-registry';

export const mockRegistry: Registry = {
  version: '0.1.0',
  baseUrl: 'https://raw.githubusercontent.com/brkpt-labs/brkpt-auth/main/lib',
  common: [
    'common/constants/index.ts',
    'common/interfaces/index.ts',
    'common/utils/index.ts',
    'common/decorators/public.decorator.ts',
  ],
  commonDependencies: {
    dependencies: ['ms', '@nestjs/event-emitter'],
    devDependencies: ['@types/ms'],
  },
  module: 'brkpt-auth.module.ts',
  featuresTemplate: 'features.ts',
  features: {
    core: {
      files: [
        'features/core/core.service.ts',
        'features/core/core.port.ts',
        'features/core/core.feature.ts',
        'features/core/core.controller.ts',
        'features/core/core.service.spec.ts',
        'features/core/guards/jwt.guard.ts',
        'features/core/guards/jwt-refresh.guard.ts',
      ],
      dependencies: ['@nestjs/jwt'],
      devDependencies: [],
    },
    credentials: {
      files: [
        'features/credentials/credentials.service.ts',
        'features/credentials/credentials.port.ts',
        'features/credentials/credentials.feature.ts',
        'features/credentials/credentials.controller.ts',
        'features/credentials/credentials.service.spec.ts',
        'features/credentials/dto/sign-in.dto.ts',
        'features/credentials/dto/sign-up.dto.ts',
      ],
      dependencies: [],
      devDependencies: [],
    },
    blacklist: {
      files: [
        'features/blacklist/blacklist.service.ts',
        'features/blacklist/blacklist.port.ts',
        'features/blacklist/blacklist.feature.ts',
        'features/blacklist/blacklist.guard.ts',
        'features/blacklist/blacklist.service.spec.ts',
      ],
      dependencies: [],
      devDependencies: [],
    },
    oauth: {
      files: [
        'features/oauth/oauth.service.ts',
        'features/oauth/oauth.port.ts',
        'features/oauth/oauth.feature.ts',
        'features/oauth/oauth.controller.ts',
        'features/oauth/oauth.verifier.ts',
        'features/oauth/oauth.service.spec.ts',
        'features/oauth/dto/oauth.dto.ts',
      ],
      dependencies: [],
      devDependencies: [],
      verifiers: {
        google: {
          files: ['features/oauth/verifiers/google.verifier.ts'],
          dependencies: ['google-auth-library'],
          devDependencies: [],
        },
        github: {
          files: ['features/oauth/verifiers/github.verifier.ts'],
          dependencies: [],
          devDependencies: [],
        },
      },
    },
    'verify-email': {
      files: [
        'features/verify-email/verify-email.service.ts',
        'features/verify-email/verify-email.port.ts',
        'features/verify-email/verify-email.feature.ts',
        'features/verify-email/verify-email.controller.ts',
        'features/verify-email/verify-email.guard.ts',
        'features/verify-email/verify-email.service.spec.ts',
        'features/verify-email/dto/send.dto.ts',
        'features/verify-email/dto/verify.dto.ts',
      ],
      extraFiles: ['common/decorators/skip-verify-email.decorator.ts'],
      dependencies: [],
      devDependencies: [],
    },
  },
};
