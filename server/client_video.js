import Peer from 'simple-peer';

// Get access to the user's webcam and microphone
navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then(stream => {
    // Create a new Peer object
    const peer = new Peer({ initiator: true, stream });

    peer.on('signal', data => {
        // Send signal data to the other peer through Socket.IO
        // This needs to be implemented in your own way
        // For example, you could use a WebSocket connection or some other real-time communication method
        socket.emit('signal', data);
    });

    socket.on('signal', data => {
        // When signal data is received from the other peer, pass it to the `peer.signal` function
        peer.signal(data);
    });

    peer.on('stream', stream => {
        // When a stream is received from the other peer, attach it to a <video> element to display the video
        const video = document.querySelector('video');
        video.srcObject = stream;
        video.play();
    });

    peer.on('connect', () => {
        // Once the peer connection is fully open, you can start sending data
        peer.send('hello world');
    });

    peer.on('data', data => {
        // When data is received from the other peer, you can handle it here
        console.log('Received data: ' + data);
    });

    peer.on('close', () => {
        // Handle the peer connection closing here
        console.log('Connection closed');
    });

    peer.on('error', err => {
        // Handle any errors here
        console.error('Error: ' + err.message);
    });
}).catch(err => {
    console.error('Failed to get user media', err);
});