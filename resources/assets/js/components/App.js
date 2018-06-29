import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import MediaHandler from '../MediaHandler';
import Pusher from 'pusher-js';
import peer from 'simple-peer';
export default class App extends Component {
    constructor() {
        super();
        this.state = {
            hasMedia: false,
            otherUserId: null
        };
        this.user         = window.user;
        this.peers        = {};
        this.mediaHandler = new MediaHandler();
        this.user.stream  = null;
        this.callTo       = this.callTo.bind(this);
        this.setupPusher  = this.setupPusher.bind(this);
        this.startPeer    = this.startPeer.bind(this);
        this.setupPusher();
    }
    componentWillMount() {
        this.mediaHandler.getPermission()
        .then((stream)=> {
            this.setState({hasMedia:true});
            this.user.stream  = stream;
            try {
                this.myVideo.srcObject = stream;
            } catch(e) {
                this.myVideo.src = URL.createObjectUrl(stream);
            }
            this.myVideo.play();
        });
    }
    setupPusher() {
        this.pusher = new Pusher(APP_KEY, {
            authEndpoint: '/pusher/auth',
            cluster: 'ap2',
            auth: {
                params: this.user.id,
                header: {
                    'X-CSRF-Token': window.csrfToken
                }
            }
        });

        this.channel = this.pusher.subscribe('presence-video-channel');
        this.channel.bind(`client-signal-${this.user.id}`,(signal) => {
            let peer = this.peers[signal.userId];
            if (peer === undefined) {
                this.setState({otherUserId:signal.userId});
                peer = this.startPeer(signal.userId,false);
            }
        });
    }
    startPeer(userId,initiator) {
        const peer = new peer({
            initiator,
            stream: this.user.stream,
            trickle: false
        });
        peer.on('signal',(data)=> {
            this.channel.trigger(`client-signal-${userId}`, {
                type: 'signal',
                userId: this.user.id,
                data: data
            });
        });
        peer.on('stream',(stream) => {
            try {
                this.userVideo.srcObject = stream;
            } catch(e) {
                this.userVideo.src = URL.createObjectUrl(stream);
            }
            this.userVideo.play();
        });
        peer.on('close',() => {
            let peer = this.peers[userId];
            if (peer != undefined) {
                peer.destroy();
            }
            this.peers[userId] = undefined;

        });
    }
    callTo(userId) {
        this.peers[userId] = this.startPeer(userId);
    }
    render() {
        return (
            <div className="App">
                {[1,2,3,4].map((userId)=>(
                    <button onClick={() => this.callTo(userId)}>Call {userId}</button>
                ))}
                <div className="video-container">
                    <video className="my-video" ref={(ref) => {this.myVideo = ref;}}></video>
                    <video className="user-video" ref={(ref) => {this.userVideo = ref;}}></video>
                </div>
            </div>
        );
    }
}

if (document.getElementById('app')) {
    ReactDOM.render(<App />, document.getElementById('app'));
}
