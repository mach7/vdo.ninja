/**
 * FLW Call Ringer Prototype
 * 
 * This is a lightweight prototype for testing call ringing and presence.
 * It does NOT handle video/audio streaming - only call intent + ringing.
 * 
 * TRANSPORT LAYER:
 * Currently uses BroadcastChannel API for cross-tab communication.
 * 
 * TO REPLACE WITH WSS:
 * - Replace SignalingChannel class implementation
 * - Change sendMessage() to use WebSocket.send()
 * - Change message event handling to WebSocket.onmessage
 * - Add connection management (connect, disconnect, reconnect)
 * - Add authentication/authorization if needed
 * 
 * MEDIA SETUP POINT:
 * After Accept button is clicked and call is accepted, this is where
 * WebRTC media setup would begin:
 * - Create RTCPeerConnection
 * - Set up local/remote SDP
 * - Handle ICE candidates
 * - Connect media streams
 */

// ============================================================================
// Configuration
// ============================================================================

const SIGNALING_CHANNEL_NAME = 'flw-call-ringer';
const RING_SOUND_FREQUENCY = 800; // Hz
const RING_SOUND_DURATION = 0.3; // seconds per beep
const RING_SOUND_PAUSE = 0.3; // seconds between beeps

// ============================================================================
// State Management
// ============================================================================

let currentUser = null;
let onlineUsers = [];
let currentCall = null; // { caller, target, timestamp, status }
let ringAudioContext = null;
let ringOscillator = null;
let ringInterval = null;

// ============================================================================
// Signaling Channel (BroadcastChannel API)
// ============================================================================

class SignalingChannel {
    constructor(channelName) {
        this.channelName = channelName;
        this.channel = new BroadcastChannel(channelName);
        this.listeners = [];
        
        // Listen for messages from other tabs
        this.channel.onmessage = (event) => {
            const message = event.data;
            this.listeners.forEach(listener => {
                try {
                    listener(message);
                } catch (error) {
                    console.error('Error in message listener:', error);
                }
            });
        };
    }

    /**
     * Send a message to all tabs (via BroadcastChannel)
     * 
     * TO REPLACE WITH WSS:
     * Replace this with: websocket.send(JSON.stringify(message))
     */
    sendMessage(message) {
        this.channel.postMessage(message);
    }

    /**
     * Register a listener for incoming messages
     * 
     * TO REPLACE WITH WSS:
     * Replace this with: websocket.onmessage = (event) => { ... }
     */
    onMessage(callback) {
        this.listeners.push(callback);
    }

    /**
     * Clean up resources
     */
    close() {
        this.channel.close();
        this.listeners = [];
    }
}

// Initialize signaling channel
const signaling = new SignalingChannel(SIGNALING_CHANNEL_NAME);

// ============================================================================
// Ring Sound Management (Web Audio API)
// ============================================================================

function startRinging() {
    if (ringAudioContext) {
        stopRinging();
    }

    try {
        ringAudioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Create a simple beeping pattern
        let beepCount = 0;
        
        function playBeep() {
            const oscillator = ringAudioContext.createOscillator();
            const gainNode = ringAudioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(ringAudioContext.destination);
            
            oscillator.frequency.value = RING_SOUND_FREQUENCY;
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0.3, ringAudioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, ringAudioContext.currentTime + RING_SOUND_DURATION);
            
            oscillator.start(ringAudioContext.currentTime);
            oscillator.stop(ringAudioContext.currentTime + RING_SOUND_DURATION);
        }
        
        // Play beep pattern
        playBeep();
        ringInterval = setInterval(() => {
            playBeep();
        }, (RING_SOUND_DURATION + RING_SOUND_PAUSE) * 1000);
        
    } catch (error) {
        console.error('Error starting ring sound:', error);
        logEvent('error', 'Could not play ring sound: ' + error.message);
    }
}

function stopRinging() {
    if (ringInterval) {
        clearInterval(ringInterval);
        ringInterval = null;
    }
    
    if (ringAudioContext) {
        ringAudioContext.close().catch(console.error);
        ringAudioContext = null;
    }
}

// ============================================================================
// Event Logging
// ============================================================================

function logEvent(type, message, data = null) {
    const eventLog = document.getElementById('event-log');
    const entry = document.createElement('div');
    entry.className = `event-log-entry ${type}`;
    
    const timestamp = new Date().toLocaleTimeString();
    const dataStr = data ? ` | ${JSON.stringify(data)}` : '';
    
    entry.innerHTML = `
        <span class="timestamp">[${timestamp}]</span>
        <span class="event-type">${type.toUpperCase()}</span>
        ${message}${dataStr}
    `;
    
    eventLog.insertBefore(entry, eventLog.firstChild);
    
    // Keep only last 50 entries
    while (eventLog.children.length > 50) {
        eventLog.removeChild(eventLog.lastChild);
    }
}

// ============================================================================
// UI Updates
// ============================================================================

function updateUserList() {
    const userListEl = document.getElementById('user-list');
    userListEl.innerHTML = '';
    
    onlineUsers.forEach(user => {
        const li = document.createElement('li');
        li.className = 'user-item';
        
        const isSelf = user.id === currentUser.id;
        const isCalling = currentCall && currentCall.status === 'calling' && currentCall.target === user.id;
        
        li.innerHTML = `
            <div class="user-info">
                <span class="user-name">${user.name}</span>
                <span class="user-badge ${isSelf ? 'self' : ''}">${isSelf ? 'You' : 'Online'}</span>
            </div>
            <button 
                class="phone-btn" 
                data-user-id="${user.id}"
                ${isSelf || isCalling ? 'disabled' : ''}
            >
                📞 Call
            </button>
        `;
        
        // Add click handler
        if (!isSelf && !isCalling) {
            li.querySelector('.phone-btn').addEventListener('click', () => {
                initiateCall(user.id, user.name);
            });
        }
        
        userListEl.appendChild(li);
    });
}

function updateCallStatus(status, text) {
    const statusEl = document.getElementById('call-status');
    const statusTextEl = document.getElementById('status-text');
    
    statusEl.className = `call-status ${status}`;
    statusTextEl.textContent = text;
}

function showIncomingCall(callerName) {
    const section = document.getElementById('incoming-call-section');
    const callerNameEl = document.getElementById('caller-name-display');
    
    callerNameEl.textContent = callerName;
    section.style.display = 'flex';
    
    startRinging();
    updateCallStatus('incoming', `Incoming call from ${callerName}`);
}

function hideIncomingCall() {
    const section = document.getElementById('incoming-call-section');
    section.style.display = 'none';
    stopRinging();
}

// ============================================================================
// Call Management
// ============================================================================

function initiateCall(targetUserId, targetUserName) {
    if (currentCall) {
        logEvent('error', 'Already in a call');
        return;
    }
    
    currentCall = {
        caller: currentUser.id,
        callerName: currentUser.name,
        target: targetUserId,
        targetName: targetUserName,
        timestamp: Date.now(),
        status: 'calling'
    };
    
    // Send call request via signaling
    signaling.sendMessage({
        type: 'call-request',
        from: currentUser.id,
        fromName: currentUser.name,
        to: targetUserId,
        timestamp: currentCall.timestamp
    });
    
    logEvent('call-request', `Calling ${targetUserName}`, {
        target: targetUserId,
        timestamp: currentCall.timestamp
    });
    
    updateCallStatus('calling', `Calling ${targetUserName}...`);
    updateUserList();
}

function handleIncomingCall(message) {
    if (currentCall) {
        // Already in a call, ignore
        return;
    }
    
    currentCall = {
        caller: message.from,
        callerName: message.fromName,
        target: currentUser.id,
        timestamp: message.timestamp,
        status: 'incoming'
    };
    
    logEvent('call-request', `Incoming call from ${message.fromName}`, {
        caller: message.from,
        timestamp: message.timestamp
    });
    
    showIncomingCall(message.fromName);
}

function acceptCall() {
    if (!currentCall || currentCall.status !== 'incoming') {
        return;
    }
    
    // Send accept response
    signaling.sendMessage({
        type: 'call-accepted',
        from: currentUser.id,
        fromName: currentUser.name,
        to: currentCall.caller,
        timestamp: Date.now()
    });
    
    currentCall.status = 'in-call';
    hideIncomingCall();
    
    logEvent('call-accepted', `Accepted call from ${currentCall.callerName}`);
    updateCallStatus('in-call', `Call connected (media not implemented)`);
    
    // MEDIA SETUP POINT:
    // This is where WebRTC media setup would begin:
    // - Create RTCPeerConnection
    // - Exchange SDP offers/answers
    // - Handle ICE candidates
    // - Connect audio/video streams
}

function declineCall() {
    if (!currentCall || currentCall.status !== 'incoming') {
        return;
    }
    
    // Send decline response
    signaling.sendMessage({
        type: 'call-declined',
        from: currentUser.id,
        fromName: currentUser.name,
        to: currentCall.caller,
        timestamp: Date.now()
    });
    
    const callerName = currentCall.callerName;
    currentCall = null;
    hideIncomingCall();
    
    logEvent('call-declined', `Declined call from ${callerName}`);
    updateCallStatus('idle', 'Ready');
}

function handleCallAccepted(message) {
    if (!currentCall || currentCall.status !== 'calling' || currentCall.target !== message.from) {
        return;
    }
    
    currentCall.status = 'in-call';
    
    logEvent('call-accepted', `${currentCall.targetName} accepted the call`);
    updateCallStatus('in-call', `Call connected (media not implemented)`);
    
    // MEDIA SETUP POINT:
    // This is where WebRTC media setup would begin for the caller side
}

function handleCallDeclined(message) {
    if (!currentCall || currentCall.status !== 'calling' || currentCall.target !== message.from) {
        return;
    }
    
    const targetName = currentCall.targetName;
    currentCall = null;
    
    logEvent('call-declined', `${targetName} declined the call`);
    updateCallStatus('idle', 'Ready');
    updateUserList();
}

// ============================================================================
// Signaling Message Handler
// ============================================================================

signaling.onMessage((message) => {
    // Ignore messages from self
    if (message.from === currentUser.id) {
        return;
    }
    
    switch (message.type) {
        case 'user-online':
            // Update online users list
            const existingIndex = onlineUsers.findIndex(u => u.id === message.userId);
            if (existingIndex === -1) {
                onlineUsers.push({
                    id: message.userId,
                    name: message.userName
                });
                logEvent('user-online', `${message.userName} came online`);
                updateUserList();
            }
            break;
            
        case 'call-request':
            handleIncomingCall(message);
            break;
            
        case 'call-accepted':
            handleCallAccepted(message);
            break;
            
        case 'call-declined':
            handleCallDeclined(message);
            break;
            
        default:
            logEvent('unknown-message', `Unknown message type: ${message.type}`);
    }
});

// ============================================================================
// Initialization
// ============================================================================

function initialize() {
    // Prompt for display name
    const displayName = prompt('Enter your display name:');
    if (!displayName || displayName.trim() === '') {
        alert('Display name is required. Reload the page to try again.');
        return;
    }
    
    // Generate a simple user ID (in real app, this would come from auth)
    const userId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    currentUser = {
        id: userId,
        name: displayName.trim()
    };
    
    // Update UI
    document.getElementById('current-user').innerHTML = `Logged in as: <strong>${currentUser.name}</strong>`;
    
    // Initialize with mock users + self
    onlineUsers = [
        { id: 'mock-user-1', name: 'Alice' },
        { id: 'mock-user-2', name: 'Bob' },
        { id: currentUser.id, name: currentUser.name }
    ];
    
    // Announce presence
    signaling.sendMessage({
        type: 'user-online',
        userId: currentUser.id,
        userName: currentUser.name,
        timestamp: Date.now()
    });
    
    logEvent('user-online', `You came online as ${currentUser.name}`);
    updateUserList();
    updateCallStatus('idle', 'Ready');
    
    // Set up Accept/Decline buttons
    document.getElementById('accept-btn').addEventListener('click', acceptCall);
    document.getElementById('decline-btn').addEventListener('click', declineCall);
    
    // Clean up on page unload
    window.addEventListener('beforeunload', () => {
        stopRinging();
        signaling.close();
    });
}

// Start when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
} else {
    initialize();
}
