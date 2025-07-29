export const Cookie = {
  Name: {
    SESSION: 'connect.sid',
    ACCESS_TOKEN: 'access-token',
  },
  MaxAge: {
    DEFAULT: 3 * 24 * 60 * 60 * 1000, // 3 days
  },
};

export const TOKEN_ID_LENGTH = 10;

export const Url = {
  CONTACT: 'https://docs.google.com/forms/d/1oUM87A2Kkv7ME9OhRtNDZ_HyMsoKzJR_lOCwna4T_rU/',
  GITHUB: 'https://github.com/byronncat',
  LINKEDIN: 'https://www.linkedin.com/in/thinh-ngo-byron/',
  FACEBOOK: 'https://www.facebook.com/profile.php?id=100085017111681',

  // SVGs can be blocked by some email clients for security reasons (because SVG can contain scripts).
  ICON: 'https://res.cloudinary.com/dq02xgn2g/image/upload/v1753716413/Public/moment-up-icon.png',
};

export const INITIAL_PAGE = 1;

export enum ProfileVisibility {
  PUBLIC,
  PRIVATE,
}

export enum Audience {
  PUBLIC,
  FOLLOWERS,
  FRIENDS,
  VERIFIED,
  ONLY_ME,
}

export enum ReportType {
  NOT_RELEVANT,
  SPAM,
  ABUSIVE,
  NOT_INTERESTED,
  DUPLICATE,
  HARMFUL,
}

export enum SearchItemType {
  USER,
  QUERY,
  HASHTAG,
  POST,
}
