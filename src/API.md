# API Documentation

## Base URL

- **Version**: v1
- **Base URL**: `/v1`

## Authentication

🔒 = Requires Access Token. The token should be included in the Authorization header:

```
Authorization: Bearer <access_token>
```

## Response Format

All responses follow a consistent JSON structure. Error responses include appropriate HTTP status codes and error messages.

---

## Auth Module

**Base Path**: `/auth`

### POST /login

**Description**: Authenticate user with credentials  
**Method**: `POST`  
**Authentication**: None  
**Status Code**: `200 OK`

**Request Body**:

```json
{
  "identity": "string (required) - username or email",
  "password": "string (required) - user password"
}
```

**Response**:

```json
{
  "accessToken": "string",
  "user": {
    "id": "string",
    "username": "string",
    "displayName": "string",
    "email": "string",
    "blocked": false,
    "verified": true,
    "hasFeed": true,
    "avatar": "string | null",
    "backgroundImage": "string | null",
    "bio": "string | null",
    "created_at": "string (ISO date)"
  }
}
```

### POST /register

**Description**: Register new user account  
**Method**: `POST`  
**Authentication**: None  
**Status Code**: `201 CREATED`

**Request Body**:

```json
{
  "email": "string (required) - valid email address",
  "username": "string (required) - min 2 chars, alphanumeric + dots/underscores/hyphens",
  "password": "string (required) - min 8 chars, must include 3 of: uppercase, lowercase, number"
}
```

**Response**:

```json
{
  "user": {
    "id": "string",
    "username": "string",
    "displayName": "string",
    "email": "string",
    "blocked": false,
    "verified": false,
    "hasFeed": false,
    "avatar": "string | null",
    "backgroundImage": "string | null",
    "bio": "string | null",
    "created_at": "string (ISO date)"
  }
}
```

### POST /logout

**Description**: Logout user and invalidate session  
**Method**: `POST`  
**Authentication**: Session-based  
**Status Code**: `204 NO_CONTENT`

**Request Body**: None  
**Response**: Empty body

### GET /refresh

**Description**: Refresh authentication token  
**Method**: `GET`  
**Authentication**: Session-based  
**Status Code**: `200 OK`

**Response**:

```json
{
  "accessToken": "string"
}
```

### GET /me

**Description**: Get current user information  
**Method**: `GET`  
**Authentication**: Session-based or Access Token  
**Status Code**: `200 OK`

**Response**:

```json
{
  "user": {
    "id": "string",
    "username": "string",
    "displayName": "string",
    "email": "string",
    "blocked": false,
    "verified": true,
    "hasFeed": true,
    "avatar": "string | null",
    "backgroundImage": "string | null",
    "bio": "string | null",
    "created_at": "string (ISO date)"
  }
}
```

### GET /csrf

**Description**: Get CSRF token for form submissions  
**Method**: `GET`  
**Authentication**: None  
**Status Code**: `200 OK`

**Response**:

```json
{
  "csrfToken": "string"
}
```

### POST /send-otp-email

**Description**: Send OTP to email for password recovery  
**Method**: `POST`  
**Authentication**: None  
**Status Code**: `200 OK`

**Request Body**:

```json
{
  "identity": "string (required) - username or email"
}
```

**Response**:

```json
{
  "message": "OTP sent to your email successfully."
}
```

### POST /recover-password

**Description**: Reset password using OTP  
**Method**: `POST`  
**Authentication**: Session-based  
**Status Code**: `200 OK`

**Request Body**:

```json
{
  "otp": "string (required) - 6 character alphanumeric OTP",
  "newPassword": "string (required) - min 8 chars, must include 3 of: uppercase, lowercase, number",
  "confirmPassword": "string (required) - must match newPassword"
}
```

**Response**:

```json
{
  "message": "Password changed successfully."
}
```

### GET /verify

**Description**: Verify email verification token  
**Method**: `GET`  
**Authentication**: None  
**Status Code**: `200 OK`

**Query Parameters**:

- `token` (string, required): Email verification token

**Response**: HTML content for verification success/failure page

### GET /google

**Description**: Initiate Google OAuth authentication  
**Method**: `GET`  
**Authentication**: None  
**Status Code**: `302 FOUND`

**Response**: Redirects to Google OAuth consent screen

### GET /google/callback

**Description**: Handle Google OAuth callback  
**Method**: `GET`  
**Authentication**: None  
**Status Code**: `302 FOUND`

**Response**: Redirects to client application with success/error

- Success: `{clientUrl}/auth/success?token={accessToken}`
- Error: `{clientUrl}/auth/error?message={errorMessage}`

---

## Core Module

**Base Path**: `/moments`

### GET /

**Description**: Get paginated list of moments  
**Method**: `GET`  
**Authentication**: None  
**Status Code**: `200 OK`

**Query Parameters**:

- `page` (number, required): Page number for pagination

**Response**:

```json
{
  "items": [
    {
      "id": "string",
      "user": {
        "id": "string",
        "username": "string",
        "displayName": "string",
        "avatar": "string | null",
        "followers": "number",
        "following": "number",
        "isFollowing": "boolean",
        "hasFeed": "boolean"
      },
      "post": {
        "text": "string (optional)",
        "files": [
          {
            "id": "string",
            "type": "image | video",
            "url": "string",
            "aspectRatio": "string"
          }
        ],
        "likes": "number",
        "comments": "number",
        "created_at": "string (ISO date)",
        "isLiked": "boolean",
        "isBookmarked": "boolean"
      }
    }
  ],
  "hasNextPage": "boolean"
}
```

---

## User Module

**Base Path**: `/users`

### POST /:id/follow 🔒

**Description**: Follow a user  
**Method**: `POST`  
**Authentication**: Access Token Required  
**Status Code**: `201 CREATED`

**Path Parameters**:

- `id` (string, required): Target user ID to follow

**Request Body**: None  
**Response**: Empty body

### DELETE /:id/unfollow 🔒

**Description**: Unfollow a user  
**Method**: `DELETE`  
**Authentication**: Access Token Required  
**Status Code**: `204 NO_CONTENT`

**Path Parameters**:

- `id` (string, required): Target user ID to unfollow

**Request Body**: None  
**Response**: Empty body

---

## Suggestion Module

**Base Path**: `/suggestion`

### GET /users 🔒

**Description**: Get user suggestions for current user  
**Method**: `GET`  
**Authentication**: Access Token Required  
**Status Code**: `200 OK`

**Response**:

```json
[
  {
    "id": "string",
    "username": "string",
    "displayName": "string",
    "avatar": "string | null",
    "bio": "string | null",
    "followers": "number",
    "following": "number",
    "isFollowing": "boolean",
    "hasFeed": "boolean",
    "followedBy": {
      "displayItems": [
        {
          "id": "string",
          "displayName": "string",
          "avatar": "string | null"
        }
      ],
      "count": "number"
    }
  }
]
```

### GET /trending

**Description**: Get trending hashtags/topics  
**Method**: `GET`  
**Authentication**: None  
**Status Code**: `200 OK`

**Response**:

```json
[
  {
    "id": "string",
    "count": "number"
  }
]
```

### POST /trending/report

**Description**: Report inappropriate trending topic  
**Method**: `POST`  
**Authentication**: None  
**Status Code**: `201 CREATED`

**Request Body**:

```json
{
  "topicId": "string (required) - ID of the trending topic",
  "type": "number (required) - Report type code"
}
```

**Response**:

```json
{
  "message": "Report submitted successfully"
}
```

---

## Notification Module

**Base Path**: `/notifications`

### GET /

**Description**: Get user notifications  
**Method**: `GET`  
**Authentication**: TBD  
**Status Code**: `200 OK`

**Response**:

```json
{
  "message": "Get notifications endpoint"
}
```

_Note: This endpoint is not yet implemented_

### GET /unread-count

**Description**: Get count of unread notifications  
**Method**: `GET`  
**Authentication**: TBD  
**Status Code**: `200 OK`

**Response**:

```json
{
  "message": "Get unread count endpoint"
}
```

_Note: This endpoint is not yet implemented_

---

## Search Module

**Base Path**: `/search`

_Note: This module is not yet implemented. Planned endpoints include:_

- `searchUsers` - Search for users
- `searchMoments` - Search for moments/posts
- `searchHashtags` - Search for hashtags
- `searchAll` - Global search

---

## Error Responses

All error responses follow this format:

```json
{
  "statusCode": "number",
  "message": "string or array of strings",
  "error": "string"
}
```

### Common Status Codes:

- `200 OK` - Success
- `201 CREATED` - Resource created successfully
- `204 NO_CONTENT` - Success with no response body
- `400 BAD_REQUEST` - Invalid request data
- `401 UNAUTHORIZED` - Authentication required
- `403 FORBIDDEN` - Access denied
- `404 NOT_FOUND` - Resource not found
- `422 UNPROCESSABLE_ENTITY` - Validation errors
- `500 INTERNAL_SERVER_ERROR` - Server error

### Validation Error Example:

```json
{
  "statusCode": 422,
  "message": ["Email is required", "Password must be at least 8 characters"],
  "error": "Unprocessable Entity"
}
```

---

## Security Features

1. **CSRF Protection**: CSRF tokens required for state-changing operations
2. **Session Management**: Express sessions for authentication state
3. **Input Validation**: All inputs validated using class-validator
4. **Password Security**: Strong password requirements enforced
5. **OAuth Integration**: Google OAuth 2.0 support
6. **Rate Limiting**: (Implementation status unknown)

---

## Notes

- All timestamps are in ISO 8601 format
- User authentication can be either session-based or token-based
- Some endpoints are still in development (marked as TODO)
- API versioning is implemented (currently v1)
- CORS is configured for allowed origins
