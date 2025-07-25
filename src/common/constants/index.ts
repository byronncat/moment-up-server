export const COOKIE_NAME = {
  SESSION: 'connect.sid',
  ACCESS_TOKEN: 'access-token',
};

export const TOKEN_ID_LENGTH = 10;

export const URL = {
  CONTACT: 'https://docs.google.com/forms/d/1oUM87A2Kkv7ME9OhRtNDZ_HyMsoKzJR_lOCwna4T_rU/',
  GITHUB: 'https://github.com/byronncat',
  LINKEDIN: 'https://www.linkedin.com/in/thinh-ngo-byron/',
  FACEBOOK: 'https://www.facebook.com/profile.php?id=100085017111681',
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
