/**
 * FLW Call Ringer - VDO.Ninja Demo
 * 
 * Audio-only call ringing and presence using VDO.Ninja SDK
 * - Presence room: "flw_presence_demo"
 * - Call rooms: "flw_call_<callId>"
 * - Messages: flw_call_offer, flw_call_accept, flw_call_busy, flw_call_end
 */

// ============================================================================
// Configuration
// ============================================================================

const PRESENCE_ROOM = 'flw_presence_demo';
const RING_SOUND_FREQUENCY = 800; // Hz
const RING_SOUND_DURATION = 0.3; // seconds per beep
const RING_SOUND_PAUSE = 0.3; // seconds between beeps

// ============================================================================
// State Management
// ============================================================================

const STATE = {
    OFFLINE: 'OFFLINE',
    CONNECTING: 'CONNECTING',
    ONLINE_AVAILABLE: 'ONLINE_AVAILABLE',
    OUTGOING_CALLING: 'OUTGOING_CALLING',
    INCOMING_RINGING: 'INCOMING_RINGING',
    IN_CALL: 'IN_CALL',
    BUSY: 'BUSY'
};

let appState = STATE.OFFLINE;
let currentUsername = null;
let currentStreamID = null;
let presenceSDK = null;
let callSDK = null;
let connectedPeers = new Map(); // Map<uuid, {username, label, status}>
let currentCall = null; // { callId, caller, callerName, target, targetName, callRoom, status }
let queuedCalls = []; // Array of { callId, caller, callerName, timestamp }
let localStream = null;
let remoteAudioElement = null;
let ringAudioContext = null;
let ringInterval = null;
let isMuted = false;

// ============================================================================
// UUID Generation
// ============================================================================

function generateUUID() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    // Fallback for older browsers
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// ============================================================================
// Ring Sound Management
// ============================================================================

function startRinging() {
    if (ringAudioContext) {
        stopRinging();
    }

    try {
        ringAudioContext = new (window.AudioContext || window.webkitAudioContext)();
        
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
    if (!eventLog) return;
    
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
    
    // Keep only last 100 entries
    while (eventLog.children.length > 100) {
        eventLog.removeChild(eventLog.lastChild);
    }
    
    console.log(`[${type.toUpperCase()}] ${message}`, data || '');
}

// ============================================================================
// UI Updates
// ============================================================================

function updateAppState(newState) {
    appState = newState;
    
    const statusDot = document.getElementById('status-dot');
    const statusText = document.getElementById('status-text');
    const callStatus = document.getElementById('call-status');
    const callStatusText = document.getElementById('call-status-text');
    const cancelBtn = document.getElementById('cancel-call-btn');
    const endBtn = document.getElementById('end-call-btn');
    const muteBtn = document.getElementById('mute-mic-btn');
    
    // Update status dot
    statusDot.className = 'status-dot ' + newState.toLowerCase().replace('_', '-');
    
    // Update status text
    const statusLabels = {
        [STATE.OFFLINE]: 'Offline',
        [STATE.CONNECTING]: 'Connecting...',
        [STATE.ONLINE_AVAILABLE]: 'Online',
        [STATE.OUTGOING_CALLING]: 'Calling...',
        [STATE.INCOMING_RINGING]: 'Incoming Call',
        [STATE.IN_CALL]: 'In Call',
        [STATE.BUSY]: 'Busy'
    };
    statusText.textContent = statusLabels[newState] || newState;
    
    // Update call status
    callStatus.className = 'call-status ' + newState.toLowerCase().replace('_', '-');
    
    // Update buttons visibility
    cancelBtn.style.display = (newState === STATE.OUTGOING_CALLING) ? 'block' : 'none';
    endBtn.style.display = (newState === STATE.IN_CALL) ? 'block' : 'none';
    muteBtn.style.display = (newState === STATE.IN_CALL) ? 'block' : 'none';
    
    // Update call status text
    if (newState === STATE.ONLINE_AVAILABLE) {
        callStatusText.textContent = 'Ready';
    } else if (newState === STATE.OUTGOING_CALLING && currentCall) {
        callStatusText.textContent = `Calling ${currentCall.targetName}...`;
    } else if (newState === STATE.IN_CALL) {
        callStatusText.textContent = 'Call connected';
    } else if (newState === STATE.BUSY) {
        callStatusText.textContent = 'Busy';
    }
}

function updatePresenceList() {
    const presenceList = document.getElementById('presence-list');
    if (!presenceList) return;
    
    presenceList.innerHTML = '';
    
    // Filter out self
    const otherPeers = Array.from(connectedPeers.values()).filter(
        peer => peer.username !== currentUsername
    );
    
    if (otherPeers.length === 0) {
        presenceList.innerHTML = '<li class="empty-state">No other users online</li>';
        return;
    }
    
    otherPeers.forEach(peer => {
        const li = document.createElement('li');
        li.className = 'presence-item';
        
        const isBusy = peer.status === 'busy' || appState === STATE.IN_CALL;
        
        li.innerHTML = `
            <div class="presence-info">
                <span class="presence-name">${peer.username || peer.label || 'Unknown'}</span>
                <span class="presence-status-badge ${isBusy ? 'busy' : ''}">
                    ${isBusy ? 'Busy' : 'Available'}
                </span>
            </div>
            <button 
                class="phone-btn" 
                data-uuid="${peer.uuid}"
                ${isBusy || appState !== STATE.ONLINE_AVAILABLE ? 'disabled' : ''}
            >
                📞 Call
            </button>
        `;
        
        // Add click handler
        if (!isBusy && appState === STATE.ONLINE_AVAILABLE) {
            li.querySelector('.phone-btn').addEventListener('click', () => {
                initiateCall(peer.uuid, peer.username || peer.label);
            });
        }
        
        presenceList.appendChild(li);
    });
}

function showIncomingCall(callerName) {
    const section = document.getElementById('incoming-call-section');
    const callerNameEl = document.getElementById('caller-name-display');
    
    if (section && callerNameEl) {
        callerNameEl.textContent = callerName;
        section.style.display = 'flex';
        startRinging();
    }
}

function hideIncomingCall() {
    const section = document.getElementById('incoming-call-section');
    if (section) {
        section.style.display = 'none';
    }
    stopRinging();
}

function showQueueBadge() {
    const section = document.getElementById('queue-section');
    if (section) {
        section.style.display = 'block';
    }
}

function hideQueueBadge() {
    const section = document.getElementById('queue-section');
    if (section) {
        section.style.display = 'none';
    }
}

// ============================================================================
// VDO.Ninja SDK - Presence Room
// ============================================================================

async function initializePresenceSDK() {
    if (!window.VDONinjaSDK) {
        logEvent('error', 'VDO.Ninja SDK not loaded');
        alert('VDO.Ninja SDK failed to load. Please check your connection.');
        return false;
    }
    
    try {
        // Generate unique stream ID for this user
        currentStreamID = `flw-${currentUsername}-${Date.now()}`;
        
        // Initialize SDK for presence room
        presenceSDK = new VDONinjaSDK({
            room: PRESENCE_ROOM,
            password: false,
            debug: false,
            label: currentUsername
        });
        
        // Set up event listeners
        setupPresenceEventListeners();
        
        // Connect
        await presenceSDK.connect();
        logEvent('connection', 'Connecting to presence room...');
        
        // Announce ourselves
        await presenceSDK.announce({
            streamID: currentStreamID,
            room: PRESENCE_ROOM,
            label: currentUsername
        });
        
        // Join room to discover peers
        await presenceSDK.joinRoom({ room: PRESENCE_ROOM });
        
        logEvent('connection', 'Connected to presence room');
        updateAppState(STATE.ONLINE_AVAILABLE);
        
        return true;
    } catch (error) {
        logEvent('error', 'Failed to initialize presence SDK: ' + error.message, error);
        console.error('Presence SDK initialization error:', error);
        return false;
    }
}

function setupPresenceEventListeners() {
    if (!presenceSDK) return;
    
    // Connection events
    presenceSDK.addEventListener('connected', () => {
        logEvent('connection', 'Connected to signaling server');
    });
    
    presenceSDK.addEventListener('disconnected', () => {
        logEvent('connection', 'Disconnected from signaling server');
        connectedPeers.clear();
        updatePresenceList();
        if (appState !== STATE.OFFLINE) {
            updateAppState(STATE.CONNECTING);
        }
    });
    
    // Peer events
    presenceSDK.addEventListener('peerConnected', async (event) => {
        const peerUUID = event.detail.uuid;
        const peerLabel = event.detail.label || 'Unknown';
        
        logEvent('connection', `Peer connected: ${peerLabel} (${peerUUID})`);
        
        // Store peer info
        connectedPeers.set(peerUUID, {
            uuid: peerUUID,
            username: peerLabel,
            label: peerLabel,
            status: 'available'
        });
        
        updatePresenceList();
        
        // Connect to peer for data channel (mesh mode)
        try {
            await presenceSDK.quickView({
                streamID: peerUUID,
                password: false,
                audio: false,
                video: false
            });
        } catch (error) {
            console.warn('Failed to establish data channel with peer:', error);
        }
    });
    
    presenceSDK.addEventListener('peerDisconnected', (event) => {
        const peerUUID = event.detail.uuid;
        const peer = connectedPeers.get(peerUUID);
        
        if (peer) {
            logEvent('connection', `Peer disconnected: ${peer.username || peerUUID}`);
            connectedPeers.delete(peerUUID);
            updatePresenceList();
        }
    });
    
    // Data channel events
    presenceSDK.addEventListener('dataChannelOpen', (event) => {
        logEvent('connection', `Data channel opened with: ${event.detail.uuid}`);
    });
    
    // Handle incoming data (call signaling)
    presenceSDK.addEventListener('dataReceived', (event) => {
        const data = event.detail.data;
        const senderUUID = event.detail.uuid;
        
        // Only process our custom call messages
        if (data && typeof data === 'object' && data.type && data.type.startsWith('flw_call_')) {
            handleCallMessage(data, senderUUID);
        }
    });
    
    // Room listing (discover existing peers)
    presenceSDK.addEventListener('listing', async (event) => {
        if (event.detail.list && event.detail.list.length > 0) {
            logEvent('connection', `Found ${event.detail.list.length} peer(s) in room`);
            
            // Connect to existing peers
            for (const peer of event.detail.list) {
                if (peer.streamID && peer.streamID !== currentStreamID && peer.label) {
                    connectedPeers.set(peer.streamID, {
                        uuid: peer.streamID,
                        username: peer.label,
                        label: peer.label,
                        status: 'available'
                    });
                    
                    try {
                        await presenceSDK.quickView({
                            streamID: peer.streamID,
                            password: false,
                            audio: false,
                            video: false
                        });
                    } catch (error) {
                        console.warn('Failed to connect to existing peer:', error);
                    }
                }
            }
            
            updatePresenceList();
        }
    });
}

// ============================================================================
// Call Signaling
// ============================================================================

function handleCallMessage(message, senderUUID) {
    // Ignore messages not addressed to us
    if (message.to && message.to !== currentUsername && message.to !== currentStreamID) {
        return;
    }
    
    // Ignore messages from self
    if (message.from === currentUsername || message.from === currentStreamID) {
        return;
    }
    
    logEvent('call-' + message.type.replace('flw_call_', ''), 
        `Received: ${message.type} from ${message.from}`, message);
    
    switch (message.type) {
        case 'flw_call_offer':
            handleIncomingCallOffer(message, senderUUID);
            break;
            
        case 'flw_call_accept':
            handleCallAccepted(message);
            break;
            
        case 'flw_call_busy':
            handleCallBusy(message);
            break;
            
        case 'flw_call_end':
            handleCallEnd(message);
            break;
            
        default:
            logEvent('error', `Unknown call message type: ${message.type}`);
    }
}

function sendCallMessage(message, targetUUID = null) {
    if (!presenceSDK) {
        logEvent('error', 'Cannot send message: not connected');
        return;
    }
    
    logEvent('call-' + message.type.replace('flw_call_', ''), 
        `Sending: ${message.type} to ${message.to || 'all'}`, message);
    
    if (targetUUID) {
        // Send to specific peer
        presenceSDK.sendData(message, targetUUID);
    } else {
        // Broadcast to all (peer will filter)
        presenceSDK.sendData(message);
    }
}

// ============================================================================
// Call Management
// ============================================================================

async function initiateCall(targetUUID, targetName) {
    if (appState !== STATE.ONLINE_AVAILABLE) {
        logEvent('error', 'Cannot initiate call: not available');
        return;
    }
    
    const callId = generateUUID();
    
    currentCall = {
        callId: callId,
        caller: currentUsername,
        callerName: currentUsername,
        target: targetUUID,
        targetName: targetName,
        callRoom: `flw_call_${callId}`,
        status: 'calling'
    };
    
    // Send call offer
    sendCallMessage({
        type: 'flw_call_offer',
        from: currentUsername,
        to: targetName, // Try username first
        callId: callId,
        ts: Date.now()
    }, targetUUID);
    
    updateAppState(STATE.OUTGOING_CALLING);
    updatePresenceList();
    
    // Timeout after 30 seconds
    setTimeout(() => {
        if (currentCall && currentCall.status === 'calling' && currentCall.callId === callId) {
            logEvent('call-end', 'Call timeout - no response');
            endCall();
        }
    }, 30000);
}

function handleIncomingCallOffer(message, senderUUID) {
    // Check if we're busy
    if (appState === STATE.IN_CALL || appState === STATE.BUSY) {
        // Send busy response
        sendCallMessage({
            type: 'flw_call_busy',
            from: currentUsername,
            to: message.from,
            callId: message.callId
        }, senderUUID);
        
        logEvent('call-busy', `Rejected call from ${message.from}: busy`);
        return;
    }
    
    // Store call info
    currentCall = {
        callId: message.callId,
        caller: message.from,
        callerName: message.from,
        target: currentUsername,
        targetName: currentUsername,
        callRoom: `flw_call_${message.callId}`,
        status: 'incoming'
    };
    
    updateAppState(STATE.INCOMING_RINGING);
    showIncomingCall(message.from);
}

async function acceptCall() {
    if (!currentCall || appState !== STATE.INCOMING_RINGING) {
        return;
    }
    
    // Find caller's UUID
    let callerUUID = null;
    for (const [uuid, peer] of connectedPeers.entries()) {
        if (peer.username === currentCall.caller) {
            callerUUID = uuid;
            break;
        }
    }
    
    if (!callerUUID) {
        logEvent('error', 'Cannot accept call: caller not found');
        return;
    }
    
    // Send accept message
    sendCallMessage({
        type: 'flw_call_accept',
        from: currentUsername,
        to: currentCall.caller,
        callId: currentCall.callId,
        callRoom: currentCall.callRoom
    }, callerUUID);
    
    currentCall.status = 'accepted';
    hideIncomingCall();
    updateAppState(STATE.IN_CALL);
    
    // Set up audio call
    await setupAudioCall();
}

function declineCall() {
    if (!currentCall || appState !== STATE.INCOMING_RINGING) {
        return;
    }
    
    // Find caller's UUID
    let callerUUID = null;
    for (const [uuid, peer] of connectedPeers.entries()) {
        if (peer.username === currentCall.caller) {
            callerUUID = uuid;
            break;
        }
    }
    
    if (callerUUID) {
        sendCallMessage({
            type: 'flw_call_end',
            from: currentUsername,
            to: currentCall.caller,
            callId: currentCall.callId
        }, callerUUID);
    }
    
    const callerName = currentCall.callerName;
    currentCall = null;
    hideIncomingCall();
    updateAppState(STATE.ONLINE_AVAILABLE);
    
    logEvent('call-declined', `Declined call from ${callerName}`);
}

function handleCallAccepted(message) {
    if (!currentCall || currentCall.status !== 'calling' || currentCall.callId !== message.callId) {
        return;
    }
    
    currentCall.status = 'accepted';
    currentCall.callRoom = message.callRoom;
    
    logEvent('call-accepted', `${currentCall.targetName} accepted the call`);
    updateAppState(STATE.IN_CALL);
    
    // Set up audio call
    setupAudioCall();
}

function handleCallBusy(message) {
    if (!currentCall || currentCall.status !== 'calling' || currentCall.targetName !== message.from) {
        return;
    }
    
    const targetName = currentCall.targetName;
    const callId = currentCall.callId;
    
    // Show busy message with queue option
    const callStatusText = document.getElementById('call-status-text');
    if (callStatusText) {
        callStatusText.innerHTML = `${targetName} is busy. <button class="btn btn-primary" id="join-queue-btn" style="margin-left: 10px; padding: 5px 10px; font-size: 12px;">Join Queue</button>`;
        
        // Add queue button handler
        const queueBtn = document.getElementById('join-queue-btn');
        if (queueBtn) {
            queueBtn.addEventListener('click', () => {
                joinQueue(callId, targetName);
            });
        }
    }
    
    logEvent('call-busy', `${targetName} is busy`);
    
    // Reset after 5 seconds
    setTimeout(() => {
        if (currentCall && currentCall.callId === callId) {
            currentCall = null;
            updateAppState(STATE.ONLINE_AVAILABLE);
            updatePresenceList();
        }
    }, 5000);
}

function joinQueue(callId, targetName) {
    queuedCalls.push({
        callId: callId,
        caller: currentUsername,
        callerName: currentUsername,
        target: targetName,
        timestamp: Date.now()
    });
    
    logEvent('call-offer', `Joined queue for ${targetName}`);
    
    // Notify target (they'll see queue badge)
    // In a real implementation, this would be sent via signaling
    // For now, we'll just show a message
    alert(`You've joined the queue. ${targetName} will be notified when available.`);
    
    currentCall = null;
    updateAppState(STATE.ONLINE_AVAILABLE);
    updatePresenceList();
}

function handleCallEnd(message) {
    if (!currentCall || currentCall.callId !== message.callId) {
        return;
    }
    
    logEvent('call-end', `Call ended by ${message.from}`);
    endCall();
}

function endCall() {
    if (!currentCall) return;
    
    // Send end message if we're in a call
    if (appState === STATE.IN_CALL || appState === STATE.OUTGOING_CALLING) {
        let targetUUID = null;
        const targetName = currentCall.target || currentCall.caller;
        
        for (const [uuid, peer] of connectedPeers.entries()) {
            if (peer.username === targetName) {
                targetUUID = uuid;
                break;
            }
        }
        
        if (targetUUID) {
            sendCallMessage({
                type: 'flw_call_end',
                from: currentUsername,
                to: targetName,
                callId: currentCall.callId
            }, targetUUID);
        }
    }
    
    // Clean up audio
    cleanupAudioCall();
    
    // Reset state
    const callId = currentCall.callId;
    currentCall = null;
    hideIncomingCall();
    updateAppState(STATE.ONLINE_AVAILABLE);
    updatePresenceList();
    
    logEvent('call-end', 'Call ended');
}

// ============================================================================
// Audio Call Setup (WebRTC via VDO.Ninja SDK)
// ============================================================================

async function setupAudioCall() {
    if (!currentCall || !currentCall.callRoom) {
        logEvent('error', 'Cannot setup audio: invalid call state');
        return;
    }
    
    try {
        logEvent('connection', 'Setting up audio call...');
        
        // Request microphone access
        localStream = await navigator.mediaDevices.getUserMedia({
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
            },
            video: false
        });
        
        logEvent('connection', 'Microphone access granted');
        
        // Initialize call room SDK
        callSDK = new VDONinjaSDK({
            room: currentCall.callRoom,
            password: false,
            debug: false,
            label: currentUsername
        });
        
        // Set up call room event listeners
        setupCallRoomEventListeners();
        
        // Connect to call room
        await callSDK.connect();
        
        // Generate unique stream ID for this call
        const callStreamID = `flw-call-${currentCall.callId}-${currentUsername}`;
        
        // Announce with audio stream (SDK will handle publishing the stream)
        await callSDK.announce({
            streamID: callStreamID,
            room: currentCall.callRoom,
            label: currentUsername,
            stream: localStream, // Pass the stream directly
            audio: true,
            video: false
        });
        
        logEvent('connection', 'Published local audio stream');
        
        // Join room to discover remote peer
        await callSDK.joinRoom({ room: currentCall.callRoom });
        
        logEvent('connection', 'Audio call setup complete');
        
    } catch (error) {
        logEvent('error', 'Failed to setup audio call: ' + error.message, error);
        console.error('Audio call setup error:', error);
        endCall();
    }
}

function setupCallRoomEventListeners() {
    if (!callSDK) return;
    
    // Listen for remote streams
    callSDK.addEventListener('stream', (event) => {
        const stream = event.detail.stream;
        const streamID = event.detail.streamID;
        
        if (stream && stream.getAudioTracks().length > 0) {
            logEvent('connection', `Received remote audio stream: ${streamID}`);
            
            // Play remote audio
            remoteAudioElement = document.getElementById('remote-audio');
            if (remoteAudioElement) {
                remoteAudioElement.srcObject = stream;
                remoteAudioElement.play().catch(err => {
                    logEvent('error', 'Failed to play remote audio: ' + err.message);
                });
            }
        }
    });
    
    // Handle peer connections in call room
    callSDK.addEventListener('peerConnected', async (event) => {
        const peerUUID = event.detail.uuid;
        const peerStreamID = event.detail.streamID || peerUUID;
        
        logEvent('connection', `Peer connected in call room: ${peerUUID}`);
        
        // Subscribe to peer's audio stream
        try {
            await callSDK.quickView({
                streamID: peerStreamID,
                password: false,
                audio: true,
                video: false
            });
            logEvent('connection', `Subscribed to peer audio: ${peerStreamID}`);
        } catch (error) {
            logEvent('error', 'Failed to subscribe to peer audio: ' + error.message);
        }
    });
    
    // Handle room listing to discover existing peers
    callSDK.addEventListener('listing', async (event) => {
        if (event.detail.list && event.detail.list.length > 0) {
            logEvent('connection', `Found ${event.detail.list.length} peer(s) in call room`);
            
            // Subscribe to existing peers' audio
            for (const peer of event.detail.list) {
                if (peer.streamID && peer.streamID !== currentStreamID) {
                    try {
                        await callSDK.quickView({
                            streamID: peer.streamID,
                            password: false,
                            audio: true,
                            video: false
                        });
                        logEvent('connection', `Subscribed to existing peer: ${peer.streamID}`);
                    } catch (error) {
                        logEvent('error', `Failed to subscribe to peer ${peer.streamID}: ` + error.message);
                    }
                }
            }
        }
    });
}

function cleanupAudioCall() {
    // Stop local stream
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        localStream = null;
    }
    
    // Stop remote audio
    if (remoteAudioElement) {
        remoteAudioElement.srcObject = null;
        remoteAudioElement = null;
    }
    
    // Disconnect call room SDK
    if (callSDK) {
        try {
            callSDK.disconnect();
        } catch (error) {
            console.error('Error disconnecting call SDK:', error);
        }
        callSDK = null;
    }
    
    isMuted = false;
    updateMuteButton();
}

function toggleMute() {
    if (!localStream) return;
    
    isMuted = !isMuted;
    localStream.getAudioTracks().forEach(track => {
        track.enabled = !isMuted;
    });
    
    updateMuteButton();
    logEvent('connection', isMuted ? 'Microphone muted' : 'Microphone unmuted');
}

function updateMuteButton() {
    const muteBtn = document.getElementById('mute-mic-btn');
    if (muteBtn) {
        muteBtn.textContent = isMuted ? 'Unmute Mic' : 'Mute Mic';
        muteBtn.classList.toggle('muted', isMuted);
    }
}

// ============================================================================
// UI Event Handlers
// ============================================================================

function setupUIHandlers() {
    // Login
    const goOnlineBtn = document.getElementById('go-online-btn');
    const usernameInput = document.getElementById('username-input');
    
    if (goOnlineBtn) {
        goOnlineBtn.addEventListener('click', async () => {
            const username = usernameInput.value.trim();
            if (!username) {
                alert('Please enter a username');
                return;
            }
            
            currentUsername = username;
            
            // Hide login, show app
            document.getElementById('login-section').style.display = 'none';
            document.getElementById('app-section').style.display = 'block';
            document.getElementById('current-username').textContent = currentUsername;
            
            updateAppState(STATE.CONNECTING);
            
            // Initialize presence SDK
            const success = await initializePresenceSDK();
            if (!success) {
                alert('Failed to connect. Please try again.');
                document.getElementById('login-section').style.display = 'block';
                document.getElementById('app-section').style.display = 'none';
                updateAppState(STATE.OFFLINE);
            }
        });
        
        // Allow Enter key to submit
        if (usernameInput) {
            usernameInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    goOnlineBtn.click();
                }
            });
        }
    }
    
    // Accept/Decline buttons
    const acceptBtn = document.getElementById('accept-btn');
    const declineBtn = document.getElementById('decline-btn');
    
    if (acceptBtn) {
        acceptBtn.addEventListener('click', acceptCall);
    }
    
    if (declineBtn) {
        declineBtn.addEventListener('click', declineCall);
    }
    
    // Cancel/End call buttons
    const cancelBtn = document.getElementById('cancel-call-btn');
    const endBtn = document.getElementById('end-call-btn');
    const muteBtn = document.getElementById('mute-mic-btn');
    
    if (cancelBtn) {
        cancelBtn.addEventListener('click', endCall);
    }
    
    if (endBtn) {
        endBtn.addEventListener('click', endCall);
    }
    
    if (muteBtn) {
        muteBtn.addEventListener('click', toggleMute);
    }
}

// ============================================================================
// Initialization
// ============================================================================

function initialize() {
    logEvent('connection', 'Application initialized');
    setupUIHandlers();
    
    // Clean up on page unload
    window.addEventListener('beforeunload', () => {
        stopRinging();
        cleanupAudioCall();
        if (presenceSDK) {
            try {
                presenceSDK.disconnect();
            } catch (error) {
                console.error('Error disconnecting presence SDK:', error);
            }
        }
    });
}

// Start when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
} else {
    initialize();
}
