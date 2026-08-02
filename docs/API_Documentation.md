# API Documentation

## `POST /analyze-frame`
Analyzes a video frame for object detection, text extraction, and gesture recognition.
- **Request Body**: `multipart/form-data` containing a `file` field with the image blob.
- **Response**: JSON containing `vision`, `ocr`, and `gestures` results.

## `GET /contacts`
Returns a list of saved contacts.
- **Response**: `[{"id": 1, "name": "Arjun", "phone": "1234567890", "favorite": true}]`

## `POST /contacts`
Creates a new contact.
- **Query Params**: `name` (string), `phone` (string), `favorite` (boolean)
- **Response**: Returns the created contact object.

## `POST /sessions`
Starts a new user session and logs geolocation data.
- **Query Params**: `city`, `state`, `latitude`, `longitude`

## `PUT /sessions/{session_id}`
Ends an active session and calculates total duration.
- **Path Params**: `session_id`

## `POST /commands`
Logs a voice command spoken by the user.
- **Query Params**: `command` (string)

## `POST /navigation-logs`
Logs a navigation request.
- **Query Params**: `destination`, `distance`, `duration`
