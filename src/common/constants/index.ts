// === Configuration ===
export const RateLimit = {
  TTL: 60000, // 1 minute
  LIMIT: 100,
};

export const Cookie = {
  Name: {
    SESSION: 'connect.sid',
    ACCESS_TOKEN: 'access-token',
  },
  MaxAge: {
    DEFAULT: 3 * 24 * 60 * 60 * 1000, // 3 days
  },
};

// === Default value ===
export const TOKEN_ID_LENGTH = 10;
export const MAX_NAME_LENGTH = 50;
export const MAX_BIO_LENGTH = 160;
export const MAX_TEXT_CONTENT_LENGTH = 2000;

export const MIN_USERNAME_LENGTH = 5;
export const MIN_PASSWORD_LENGTH = 7;

export const INITIAL_PAGE = 1;

// === Template ===
export const Url = {
  CONTACT: 'https://docs.google.com/forms/d/1oUM87A2Kkv7ME9OhRtNDZ_HyMsoKzJR_lOCwna4T_rU/',
  GITHUB: 'https://github.com/byronncat',
  LINKEDIN: 'https://www.linkedin.com/in/thinh-ngo-byron/',
  FACEBOOK: 'https://www.facebook.com/profile.php?id=100085017111681',

  // SVGs can be blocked by some email clients for security reasons (because SVG can contain scripts).
  ICON: 'https://res.cloudinary.com/dq02xgn2g/image/upload/v1753716413/Public/moment-up-icon.png',
};

// === Enum ===
export enum AccountExist {
  NONE,
  EMAIL,
  USERNAME,
}

export enum ProfileVisibility {
  PUBLIC,
  PRIVATE,
}

export enum ContentPrivacy {
  PUBLIC,
  FOLLOWERS,
  PRIVATE,
}

export enum UserReportType {
  SPAM,
  IMPERSONATION,
  INAPPROPRIATE_CONTENT,
  ABUSIVE,
  HARMFUL,
  CHILD_EXPLORATION,
  SEXUAL_CONTENT,
  FAKE_INFORMATION,
  DONT_WANT_TO_SEE,
  OTHER,
}

export enum ContentReportType {
  SPAM,
  MISLEADING,
  INAPPROPRIATE_CONTENT,
  ABUSIVE,
  HARMFUL,
  SEXUAL_CONTENT,
  CHILD_EXPLOITATION,
  COPYRIGHT_VIOLATION,
  VIOLENCE,
  HATE_SPEECH,
  FAKE_INFORMATION,
  DUPLICATE,
  OTHER,
}

export enum TrendingReportType {
  NOT_RELEVANT,
  SPAM,
  ABUSIVE,
  NOT_INTERESTED,
  DUPLICATE,
  HARMFUL,
}

export enum SocialAuthError {
  ACCOUNT_BLOCKED = 'AccountBlocked',
  AUTHENTICATION_FAILED = 'AuthenticationFailed',
}

// +++ TODO: Ongoing +++
export enum SearchItemType {
  USER,
  QUERY,
  HASHTAG,
  POST,
  MEDIA,
}

export enum StoryBackground {
  BLUE_GRADIENT,
  PINK_PURPLE_BLUE_GRADIENT,
  MAGENTA_ORANGE_YELLOW_GRADIENT,
  DOWNY,
  MANDY,
  PERSIAN_BLUE,
  SOLID_BLACK,

  PURPLE_WAVY_LINE,
  PINK_TOPOGRAPHY,
  GRAY_STAIRS,
  RED_ZIG_ZAG,
  LIGHT_GRAY_WEAVE,
  STARRY_NIGHT,
  CARBON,

  ARGYLE,
  GRAY_CUBE,
  TARTAN,
  TEAL_CICADA_STRIPES,
  BLACKBERRY_ENDLESS_CONSTELLATION,
  ORANG_FLAT_MOUNTAINS,
  GREEN_HOLLOWED_BOXES,

  GREEN_TORTOISE_SHELL,
  TEAL_ROTATED_SQUARES,
  YELLOW_LIQUID_CHEESE,
  FLAMINGO_PROTRUDING_SQUARES,
  PURPLE_TO_PINK_SUBTLE_PRISM,
  SPECTRUM_GRADIENT,
  BLACK_WAVEY_FINGERPRINT,

  RADIENT_GRADIENT,
  ORANGE_SUN_TORNADO,
}

export enum NotificationType {
  ALL = 'all',
  SECURITY = 'security',
  SOCIAL = 'social',
  POST = 'post',
  REQUEST = 'request',
  MENTION = 'mention',
  FOLLOW = 'follow',
}

export enum ExploreType {
  MEDIA = 'media',
  POST = 'post',
}
