; (function (root, factory) {
    'use strict';
    /*global define,module*/

    if (typeof module === 'object' && typeof module.exports === 'object') {
        // Node, CommonJS-like
        module.exports = factory(root, document);
    } else if (typeof define === 'function' && define.amd) {
        // AMD
        define([], function () { return factory(root, document); });
    } else {
        // Browser globals (root is window)
        root.Player = factory(root, document);
    }
}(typeof window !== 'undefined' ? window : this, function (window) {
    'use strict';

    // 常用工具
    let utils = {
        each: function(obj, iterator, context) {
            if (obj == null) return;
            if (obj.length === +obj.length) {
                for (var i = 0, l = obj.length; i < l; i++) {
                    if(iterator.call(context, obj[i], i, obj) === false)
                        return false;
                }
            } else {
                for (var key in obj) {
                    if (obj.hasOwnProperty(key)) {
                        if(iterator.call(context, obj[key], key, obj) === false)
                            return false;
                    }
                }
            }
        },
        extend: function (prop) {
            Array.prototype.slice.call(arguments, 1).forEach(function (source) {
                for (var key in source) {
                    if (source.hasOwnProperty(key)) {
                        prop[key] = source[key];
                    }
                }
            });
            return prop;
        }
    };
    // 类型判断方法
    ['String', 'Function', 'Array', 'Number', 'RegExp', 'Object', 'Date'].forEach(function (v) {
        utils['is' + v] = function (obj) {
            return {}.toString.call(obj) === "[object " + v + "]";
        };
    });

    // 虚拟DOM生成器
    class Vm {
        constructor(tagName, props = {}, children = []) {
            if (!(this.tagName = tagName)) return;
            this.props = props;
            this.children = children;
        }

        render() {
            let self = this;
            let node = document.createElement(this.tagName),
                props = this.props,
                children = this.children;
            
            utils.each(props, function(value, key){
                if (/^on[A-Za-z]/.test(key)) {
                    var eventType = key.toLowerCase().replace('on', '');
                    self.addListener(node, eventType, value);
                } else {
                    node.setAttribute(key, value);
                }
            }); 
            children.forEach(function(child) {
                if (utils.isArray(child)) {
                    child.forEach(function(item){
                        item && (item instanceof HTMLElement ? node.appendChild(item) : node.insertAdjacentHTML('beforeend', item));
                    })
                } else {
                    child && (child instanceof HTMLElement ? node.appendChild(child) : node.insertAdjacentHTML('beforeend', child));
                }
            });
            return node;
        }

        addListener(element, event, listener) {
            var self = this;
            if (!this.hasOwnProperty('listeners')) {
                this.listeners || (this.listeners = {});
            };
            self.listeners[event] || (self.listeners[event] = []);
            self.listeners[event].push(listener);
            element.addEventListener(event, listener);
        }

        removeListener(element, event, listener) {
            var self = this, list;
            list = self.listeners != null ? self.listeners[event] : void 0;
            if (!list) return;
            if (!listener) return delete self.listeners[event];
            list.forEach(function(handler,i){
                if (!(handler === listener)) return;
                element.removeEventListener(event, handler)
                list.splice(i, 1);
                self.listeners[event] = list;
            });
        }
    }
    let ce = function(tagName, props, children) {
        return new Vm(tagName, props, children).render();
    }

    let mousedown = false;
    let defaults = {
        source: '',
        poster: '',
        mute: true,
        height: '',
        width: '',
        autoplay: true
    }
    let loading = ce('div', {class: 'play-loading'}, [0,0,0,0,0,0,0,0].map(function(item){
        return ce('span');
    }));

    function launchFullScreen(element) {  
        if(element.requestFullScreen) {  
            element.requestFullScreen();  
        } else if(element.mozRequestFullScreen) {  
            element.mozRequestFullScreen();  
        } else if(element.webkitRequestFullScreen) {  
            element.webkitRequestFullScreen();  
        }  
    }  

    function exitFullscreen(element) {
        if(document.exitFullscreen) {
            document.exitFullscreen();
        } else if(document.mozCancelFullScreen) {
            document.mozCancelFullScreen();
        } else if(document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        }
    }



    class Player {

        constructor(element, options) {
            let self = this;
            this.btns = {};
            element = document.getElementById(element);
            defaults.width = element.getAttribute('width') || defaults.width;
            defaults.height = element.getAttribute('height') || defaults.height;

            utils.extend(defaults, options);
            this.media = element;
            this.media.removeAttribute('controls');

            this.wrap = ce('div', {class: 'play-wrap', style: `width: ${defaults.width}px; height: ${defaults.height}px;`});
            this.media.parentNode.appendChild(this.wrap); 
            this.wrap.appendChild(this.media);
            this.loading = loading;
            // this.wrap.appendChild(this.loading = loading);

            this.buildControl();
            this.initEvents();
        }
        // 自定义控制条 动态生成
        buildControl() {
            let controls = this.controls();
            let control = ce('div', {class: 'play-control'}, [
                controls.play,
                controls.time,
                controls.space,
                controls.voice,
                controls.speed,
                controls.fullscreen,
                controls.progress
            ]);
            this.wrap.appendChild(control);
        }
        // 控制栏相关元素
        controls() {
            let self = this;
            return {
                // 播放按钮
                play: ce('div', {class: 'play-btn control-btn'}, [
                    self.btns.play = ce('i', {class: 'picon icon-play', onClick: function(){
                        self.togglePlay(!this.classList.contains('icon-pause'))
                    }})
                ]),
                // 时间显示
                time: ce('div', {class: 'time-count'}, [
                    self.btns.currenttime = ce('span', {class: 'currenttime'}),
                    '/',
                    self.btns.duration = ce('span', {class: 'duration'})
                ]),
                // 占位元素
                space: ce('div', {class: 'control-space'}),
                // 音量控制
                voice: ce('div', {class: 'voice-control'}, [
                    ce('div', {class: 'mute-btn control-btn'}, [
                        self.btns.voice = ce('i', {class: 'picon icon-voice',
                            onClick: function(ev) {
                                if (this.classList.contains('icon-mute')) {
                                    self.volume(0.6);
                                    self.btns.voiceVed.style.left = '60%';
                                    self.btns.voicePoint.style.left = '60%';
                                    this.classList.remove('icon-mute');
                                } else {
                                    self.volume(0);
                                    self.btns.voiceVed.style.left = 0;
                                    self.btns.voicePoint.style.left = 0;
                                    this.classList.add('icon-mute');
                                }
                            }
                        })
                    ]),
                    ce('div', {class: 'voice-progress',
                        onMousedown: function(ev) {
                            if (ev.button == 0) mousedown = true;
                        },
                        onMouseup: function(ev) {
                            if (ev.button == 0) mousedown = false;
                        },
                        onClick: function(ev) {
                            let vwidth = this.offsetWidth;
                            let vleft = this.getBoundingClientRect().left;
                            let left = (ev.clientX-vleft)/vwidth*100;
                            self.btns.voicePoint.style.left = left + '%';  
                            self.btns.voiceVed.style.left = left + '%'; 
                            if (left <= 100 && left >= 0) {
                                self.volume(left/100);
                            }
                            self.mute(left <= 0);
                        },
                        onMousemove: function(ev) {
                            let vleft = this.getBoundingClientRect().left;
                            let vwidth = this.offsetWidth;
                            let left = (ev.clientX-vleft)/vwidth*100;

                            if (mousedown && left <= 100 && left >= 0) {
                                self.btns.voicePoint.style.left = left + '%';  
                                self.btns.voiceVed.style.left = left + '%'; 
                                self.volume(left/100);                                 
                                self.mute(left <= 0);     
                            }   
                        },
                        onMouseleave: function(ev) {
                            if (ev.button == 0) mousedown = false;
                        }
                    }, [
                        ce('div', {class: 'voice-progress-bar'}, [
                            self.btns.voiceVed = ce('div', {class: 'voice-progress-ved'})
                        ]),
                        self.btns.voicePoint = ce('label', {class: 'voice-progress-point'})
                    ])
                ]),
                // 速度控制
                speed: ce('div', {class: 'play-speed'}, [
                    self.btns.speed = ce('span', {class: 'speed-default'}, ['1.0x']),
                    ce('div', {class: 'speed-list-wrap'}, [
                        ce('ul', {class: 'speed-list'}, [2.0, 1.75, 1.5, 1.25, 1.0].map(function(item){
                            return ce('li', {class: 'speed-item', 
                                onClick: function(ev) {
                                    self.btns.speed.textContent = `${item}x`;
                                    self.playbackRate(item);
                                }
                            }, [`${item}x`])
                        }))
                    ])
                ]),
                // 全屏
                fullscreen: ce('div', {class: 'zoomin-btn control-btn'}, [
                    self.btns.fullscreen = ce('i', {class: 'picon icon-zoomin',
                        onClick: function(ev) {
                            if (this.classList.contains('icon-zoomout')) {
                                this.classList.remove('icon-zoomout');
                                exitFullscreen(self.wrap)
                            } else {
                                this.classList.add('icon-zoomout');                
                                launchFullScreen(self.wrap)
                            }
                        }
                    })
                ]),
                // 进度条
                progress: ce('div', {class: 'play-progress', 
                    onMousedown: function(ev) {
                        if (ev.button == 0) mousedown = true;
                    },
                    onMouseup: function(ev) {
                        if (ev.button == 0) mousedown = false;
                    },
                    onClick: function(ev){
                        let pleft = this.getBoundingClientRect().left;
                        let pwidth = this.offsetWidth;
                        let left = (ev.clientX-pleft)/pwidth*100;
                        self.btns.progressPoint.style.left = left + '%';  
                        self.btns.progressPlayed.style.left = left + '%'; 
                        self.seek.call(self, left/100 * self.media.duration);
                    },
                    onMousemove: function(ev) {
                        let pleft = this.getBoundingClientRect().left;
                        let pwidth = this.offsetWidth;
                        let left = (ev.clientX-pleft)/pwidth*100;
                        self.btns.progressTips.style.left = left + '%'; 

                        let currentTime = left/100 * self.media.duration;
                        self.btns.progressTips.textContent = Math.floor(currentTime/60) + ':' + Math.floor(currentTime%60);
                        if (mousedown && left <= 100 && left >= 0) {
                            self.btns.progressPoint.style.left = left + '%';
                            self.btns.progressPlayed.style.left = left + '%';  
                            self.seek.call(self, left/100 * self.media.duration);
                        }       
                    },
                    onMouseleave: function(ev) {
                        if (ev.button == 0) mousedown = false;
                    }
                }, [
                    ce('div', {class: 'progress-bar'}, [
                        self.btns.progressBuffer = ce('div', {class: 'progress-buffer'}),
                        self.btns.progressPlayed = ce('div', {class: 'progress-played'})
                    ]),
                    self.btns.progressPoint = ce('label', {class: 'progress-point'}),
                    self.btns.progressTips = ce('label', {class: 'progress-tips'})
                ])
            }
        }

        addListener(event,listener) {
            let self = this, events = event.split(' ');
            if (!this.hasOwnProperty('listeners')) {
                this.listeners || (this.listeners = {});
            };
            events.forEach(function(event){
                self.listeners[event] || (self.listeners[event] = []);
                self.listeners[event].push(listener);
            });
            return this;
        }

        on(event, listener) {
            return this.addListener(event,listener);
        }

        once(event,listener) {
            function handler(){
                this.removeListener(event,handler);
                return listener.apply(this,arguments);
            };
            return this.addListener(event,handler);
        }

        removeListener(event,listener) {
            let self = this, events, listeners, list;
            if (arguments.length === 0) {
                this.listeners = {};
                return this;
            };
            events = event.split(' ');
            events.forEach(function(event){
                list = (listeners = self.listeners) != null ? listeners[event] : void 0;
                if (!list) return;
                if (!listener) return delete self.listeners[event];
                list.forEach(function(event,i){
                    if (!(event === listener)) return;
                    list.splice(i, 1);
                    self.listeners[event] = list;
                });
            });
            return this;
        }

        off(event,listener) {
            return this.removeListener(event,listener);
        }

        listenerList(event) {
            return this.listeners[event];
        }
        
        emit() {
            let self = this, args, listeners, event, list;
            args = arguments.length >= 1 ? [].slice.call(arguments,0) : [];
            event = args.shift();
            list = (listeners = this.listeners) != null ? listeners[event] : void 0;
            if (!list) return;
            list.forEach(function(event){
                event.apply(self, args);
            });
            return true;
        }

        // 播放
        play() {
            if ('play' in this.media) {
                this.media.play();
                this.btns.play.classList.add('icon-pause');
            }
            this.emit('play');
        }

        // 暂停
        pause() {
            if ('pause' in this.media) {
                this.media.pause();
                this.btns.play.classList.remove('icon-pause');
            }
            this.emit('pause');
        }

        // 播放／暂停
        togglePlay(toggle) {
            toggle ? this.play() : this.pause();
            return toggle;
        }

        // 跳跃
        seek(value) {
            this.media.currentTime = value;
        }
        
        // 音量
        volume(value) {
            this.media.volume = value;
        }

        // 静音
        mute(toggle) {
            if (toggle) {
                this.btns.voice.classList.add('icon-mute');
            } else {
                this.btns.voice.classList.remove('icon-mute');
            }
        }

        // 速度
        playbackRate(value) {
            this.media.playbackRate = value;
        }

        // 初始化事件
        initEvents() {
            let self = this;

            this.media.addEventListener('loadedmetadata', function(){
                self.btns.currenttime.textContent = Math.floor(this.currentTime/60) + ':' + Math.floor(this.currentTime%60);
                self.btns.duration.textContent = Math.floor(this.duration/60) + ':' + Math.floor(this.duration%60);
                this.volume = 0.6;
            });

            this.media.addEventListener('timeupdate', function(){
                var buffered = this.buffered.end(this.buffered.length - 1);
                self.btns.progressBuffer.style.left = buffered/this.duration*100 + '%';
                self.btns.progressPoint.style.left = this.currentTime/this.duration*100 + '%';
                self.btns.progressPlayed.style.left = this.currentTime/this.duration*100 + '%'; 
                self.btns.currenttime.textContent = Math.floor(this.currentTime/60) + ':' + Math.floor(this.currentTime%60);
            });

            this.media.addEventListener('click', function(){
                self.togglePlay(this.paused);
            });

            this.media.addEventListener('seeking', function(){
                self.wrap.appendChild(loading);
            });

            this.media.addEventListener('seeked', function(){
                self.wrap.removeChild(loading);
            });

            this.media.addEventListener('ended', function(){
                self.pause();
            });

            document.addEventListener('webkitfullscreenchange', function(ev){
                if (document.webkitFullscreenElement) {
                    self.wrap.classList.add('fullscreen');
                } else {
                    self.wrap.classList.remove('fullscreen');
                }
            });            
        }

    }    

    // 对象实例化
    return (element, options) => {
        return new Player(element, options);
    };
}));