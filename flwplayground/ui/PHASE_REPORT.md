# FLW Call Ringer - VDO.Ninja Demo - Phase Report

## Overview

This is a working audio-only call ringing and presence demo using VDO.Ninja SDK. It demonstrates real-time peer discovery, call signaling, and audio-only WebRTC connections through VDO.Ninja's hosted infrastructure.

## How to Run Locally

### Option 1: Simple HTTP Server (Recommended)

Since the demo uses VDO.Ninja's CDN-hosted SDK, you can run it with any simple HTTP server:

**Python 3:**
```bash
cd flwplayground/ui
python -m http.server 8000
```

**Python 2:**
```bash
cd flwplayground/ui
python -m SimpleHTTPServer 8000
```

**Node.js (http-server):**
```bash
cd flwplayground/ui
npx http-server -p 8000
```

**PHP:**
```bash
cd flwplayground/ui
php -S localhost:8000
```

Then open:
- Browser Session 1: `http://localhost:8000/call-ringer-vdo.html`
- Browser Session 2: `http://localhost:8000/call-ringer-vdo.html` (different Chrome profile or incognito)

### Option 2: Direct File Access

You can also open `call-ringer-vdo.html` directly in the browser, but some browsers may block local file access for security reasons. Using a local server is recommended.

## Room Configuration

### Presence Room
- **Room Name:** `flw_presence_demo`
- **Purpose:** All online users connect to this room to discover each other
- **Connection Type:** Data-only (no media)
- **SDK Host:** Uses VDO.Ninja default (`wss://wss.vdo.ninja`)

### Call Rooms
- **Room Name Pattern:** `flw_call_<callId>`
- **Purpose:** Dedicated room for each active call
- **Connection Type:** Audio-only WebRTC
- **Example:** `flw_call_550e8400-e29b-41d4-a716-446655440000`

## Message Protocol

All signaling messages use the VDO.Ninja SDK's data channel messaging system. Messages are sent as JSON objects with the following structure:

### Message Types

#### 1. `flw_call_offer`
**Sent by:** Caller  
**Purpose:** Initiate a call request

```json
{
  "type": "flw_call_offer",
  "from": "<caller-username>",
  "to": "<callee-username>",
  "callId": "<uuid>",
  "ts": 1234567890
}
```

#### 2. `flw_call_accept`
**Sent by:** Callee (after accepting)  
**Purpose:** Accept the call and provide call room name

```json
{
  "type": "flw_call_accept",
  "from": "<callee-username>",
  "to": "<caller-username>",
  "callId": "<uuid>",
  "callRoom": "flw_call_<callId>"
}
```

#### 3. `flw_call_busy`
**Sent by:** Callee (if busy)  
**Purpose:** Reject call because callee is in another call

```json
{
  "type": "flw_call_busy",
  "from": "<callee-username>",
  "to": "<caller-username>",
  "callId": "<uuid>"
}
```

#### 4. `flw_call_end`
**Sent by:** Either party  
**Purpose:** End an active call

```json
{
  "type": "flw_call_end",
  "from": "<sender-username>",
  "to": "<other-party-username>",
  "callId": "<uuid>"
}
```

### Message Routing

- Messages are sent via `presenceSDK.sendData(message, targetUUID)` where `targetUUID` is the peer's UUID from the presence room
- Messages include a `to` field for filtering, but routing is done via SDK's peer-to-peer data channels
- Each peer filters incoming messages to only process those addressed to them (by username or streamID)

## State Machine

The application uses a state machine with the following states:

1. **OFFLINE** - Not connected, login screen shown
2. **CONNECTING** - Connecting to presence room
3. **ONLINE_AVAILABLE** - Connected and available for calls
4. **OUTGOING_CALLING** - Initiating a call, waiting for response
5. **INCOMING_RINGING** - Receiving an incoming call
6. **IN_CALL** - Active audio call in progress
7. **BUSY** - In a call, cannot accept new calls

## Features Implemented

✅ **Real Presence** - Uses VDO.Ninja SDK to discover actual connected peers  
✅ **Call Signaling** - Custom message protocol via SDK data channels  
✅ **Audio-Only Calls** - WebRTC audio via VDO.Ninja SDK  
✅ **Busy State** - Rejects calls when user is already in a call  
✅ **Queue Placeholder** - Basic queue UI (in-memory, no persistence)  
✅ **Event Logging** - Comprehensive debug log of all events  
✅ **State Management** - Clear state machine with UI updates  
✅ **Mute/Unmute** - Toggle microphone during calls  
✅ **End Call** - Either party can end the call  

## Limitations

### Current Limitations

1. **Queue System** - Queue is in-memory only. If a user refreshes, queued calls are lost. No persistence or server-side queue management.

2. **Multiple Tabs** - If the same username is used in multiple tabs, there's no conflict detection. The last tab to connect will overwrite the previous connection.

3. **Call Timeout** - Outgoing calls timeout after 30 seconds if no response. This is hardcoded.

4. **No Call History** - No persistence of call logs or history.

5. **No Reconnection** - If connection drops, user must manually reconnect. No automatic reconnection logic.

6. **Audio Quality** - Uses browser defaults for audio codecs. No manual codec selection or quality settings.

7. **No Video** - This is audio-only by design, but the infrastructure could support video.

8. **No Screen Sharing** - Not implemented.

9. **No Group Calls** - Only 1-on-1 calls are supported.

10. **Username Validation** - Minimal validation. Usernames are not checked for uniqueness or special characters.

### Known Issues

1. **SDK Loading** - If the VDO.Ninja SDK CDN is slow or blocked, the demo won't work. Consider hosting the SDK locally for production use.

2. **Browser Permissions** - Some browsers require user interaction before allowing microphone access. The demo requests mic access only when accepting a call.

3. **Network Issues** - No explicit handling for network interruptions during calls.

4. **Error Recovery** - Limited error recovery. If a call setup fails, the user must manually end the call and try again.

## Testing Scenarios

### Basic Call Flow
1. Open two browser sessions
2. Login with different usernames (e.g., "Alice" and "Bob")
3. Both should see each other in the presence list
4. Alice clicks "Call" next to Bob
5. Bob sees incoming call modal with ring sound
6. Bob clicks "Accept"
7. Both enter call state, audio should work
8. Either can click "End Call" to disconnect

### Busy State
1. Alice calls Bob (Bob accepts)
2. While in call, Bob should show as "Busy" in presence list
3. If another user tries to call Bob, they should receive "User is busy" message
4. Caller can click "Join Queue" (placeholder functionality)

### Decline Call
1. Alice calls Bob
2. Bob clicks "Decline"
3. Alice sees call ended, returns to available state

## Future Enhancements

- [ ] Persistent queue system with server-side storage
- [ ] Call history and logging
- [ ] Automatic reconnection on disconnect
- [ ] Video support
- [ ] Group calls (3+ participants)
- [ ] Screen sharing
- [ ] Call recording
- [ ] Better error handling and recovery
- [ ] Username conflict detection
- [ ] Custom audio codec selection
- [ ] Call quality indicators (latency, packet loss)

## Technical Notes

### SDK Integration
- Uses VDO.Ninja SDK browser bundle from CDN
- Default host: `wss://wss.vdo.ninja` (SDK default)
- No custom TURN/STUN configuration (uses VDO.Ninja defaults)
- Data channels for signaling, WebRTC for media

### Audio Handling
- Requests microphone only when accepting a call
- Uses browser's default audio constraints (echo cancellation, noise suppression, auto gain control)
- Remote audio played via HTML5 `<audio>` element
- Mute/unmute toggles track enabled state

### Message Filtering
- Each message includes `from` and `to` fields
- Peers filter messages to only process those addressed to them
- Prevents processing of messages intended for other users

## Files

- `call-ringer-vdo.html` - Main HTML structure
- `call-ringer-vdo.css` - Styling
- `call-ringer-vdo.js` - Application logic and SDK integration

## Dependencies

- VDO.Ninja SDK (loaded from CDN: `https://vdo.ninja/vdoninja-sdk.js`)
- Modern browser with WebRTC support
- Microphone access (requested on call accept)

---

**Version:** 1.0  
**Date:** 2024  
**Status:** Working Demo
