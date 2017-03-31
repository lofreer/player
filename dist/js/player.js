'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

;(function (root, factory) {
    'use strict';
    /*global define,module*/

    if ((typeof module === 'undefined' ? 'undefined' : _typeof(module)) === 'object' && _typeof(module.exports) === 'object') {
        // Node, CommonJS-like
        module.exports = factory(root, document);
    } else if (typeof define === 'function' && define.amd) {
        // AMD
        define([], function () {
            return factory(root, document);
        });
    } else {
        // Browser globals (root is window)
        root.Player = factory(root, document);
    }
})(typeof window !== 'undefined' ? window : undefined, function (window) {
    'use strict';

    // 常用工具

    var utils = {
        each: function each(obj, iterator, context) {
            if (obj == null) return;
            if (obj.length === +obj.length) {
                for (var i = 0, l = obj.length; i < l; i++) {
                    if (iterator.call(context, obj[i], i, obj) === false) return false;
                }
            } else {
                for (var key in obj) {
                    if (obj.hasOwnProperty(key)) {
                        if (iterator.call(context, obj[key], key, obj) === false) return false;
                    }
                }
            }
        },
        extend: function extend(prop) {
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

    var Vm = function () {
        function Vm(tagName) {
            var props = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
            var children = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : [];

            _classCallCheck(this, Vm);

            if (!(this.tagName = tagName)) return;
            this.props = props;
            this.children = children;
        }

        _createClass(Vm, [{
            key: 'render',
            value: function render() {
                var self = this;
                var node = document.createElement(this.tagName),
                    props = this.props,
                    children = this.children;

                for (var key in props) {
                    if (/^on[A-Za-z]/.test(key)) {
                        var eventType = key.toLowerCase().replace('on', '');
                        self.addListener(node, eventType, props[key]);
                    } else {
                        node.setAttribute(key, props[key]);
                    }
                }
                children.forEach(function (child) {
                    if (Array.isArray(child)) {
                        child.forEach(function (item) {
                            item && (item instanceof HTMLElement ? node.appendChild(item) : node.insertAdjacentHTML('beforeend', item));
                        });
                    } else {
                        child && (child instanceof HTMLElement ? node.appendChild(child) : node.insertAdjacentHTML('beforeend', child));
                    }
                });
                return node;
            }
        }, {
            key: 'addListener',
            value: function addListener(element, event, listener) {
                var self = this;
                if (!this.hasOwnProperty('listeners')) {
                    this.listeners || (this.listeners = {});
                };
                self.listeners[event] || (self.listeners[event] = []);
                self.listeners[event].push(listener);
                element.addEventListener(event, listener);
            }
        }, {
            key: 'removeListener',
            value: function removeListener(element, event, listener) {
                var self = this,
                    list;
                list = self.listeners != null ? self.listeners[event] : void 0;
                if (!list) return;
                if (!listener) return delete self.listeners[event];
                list.forEach(function (handler, i) {
                    if (!(handler === listener)) return;
                    element.removeEventListener(event, handler);
                    list.splice(i, 1);
                    self.listeners[event] = list;
                });
            }
        }]);

        return Vm;
    }();

    var ce = function ce(tagName, props, children) {
        return new Vm(tagName, props, children).render();
    };

    var mousedown = false;
    var defaults = {
        source: '',
        poster: '',
        muted: false,
        height: '',
        width: '',
        autoplay: false,
        currentTime: 0
    };
    var loading = ce('div', { class: 'play-loading' }, [0, 0, 0, 0, 0, 0, 0, 0].map(function (item) {
        return ce('span');
    }));

    // 全屏
    function launchFullScreen(element) {
        if (element.requestFullScreen) {
            element.requestFullScreen();
        } else if (element.mozRequestFullScreen) {
            element.mozRequestFullScreen();
        } else if (element.webkitRequestFullScreen) {
            element.webkitRequestFullScreen();
        }
    }

    // 退出全屏
    function exitFullscreen(element) {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.mozCancelFullScreen) {
            document.mozCancelFullScreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        }
    }

    function timeCount(number) {
        var hour = Math.floor(number / 3600);
        var minute = Math.floor(number / 60 - hour * 60);
        var second = Math.round(number % 60);
        var str = '';
        if (hour > 0 && hour < 10) hour = '0' + hour;
        if (minute.toString().length === 1) minute = '0' + minute;
        if (second.toString().length === 1) second = '0' + second;
        hour && (str += hour + ':');
        str += minute + ':';
        str += '' + second;
        return str;
    }

    var Player = function () {
        function Player(element, options) {
            _classCallCheck(this, Player);

            var self = this;
            this.btns = {};
            element = document.getElementById(element);
            utils.extend(defaults, options);
            if (element.nodeName == 'VIDEO') {
                defaults.width = defaults.width || element.getAttribute('width');
                defaults.height = defaults.height || element.getAttribute('height');
                defaults.autoplay = defaults.autoplay || element.hasAttribute('autoplay');
                defaults.muted = defaults.muted || element.hasAttribute('muted');
                defaults.currentTime = parseInt(defaults.currentTime) || parseInt(element.getAttribute('currentTime'));
                this.media = element;
                this.wrap = ce('div', { class: 'play-wrap', style: 'width: ' + defaults.width + 'px; height: ' + defaults.height + 'px;' });
                this.media.parentNode.appendChild(this.wrap);
            } else {
                this.media = ce('video', {
                    src: defaults.source,
                    poster: defaults.poster
                });
                this.wrap = element;
                this.wrap.classList.add('play-wrap');
            }

            this.media.removeAttribute('controls');
            this.media.removeAttribute('muted');
            this.wrap.appendChild(this.media);
            this.wrap.appendChild(this.loading = loading);

            this.buildControl();
            this.initEvents();
        }
        // 自定义控制条 动态生成


        _createClass(Player, [{
            key: 'buildControl',
            value: function buildControl() {
                var controls = this.controls();
                this.control = ce('div', { class: 'play-control' }, [controls.play, controls.time, controls.space, controls.voice, controls.speed, controls.fullscreen, controls.progress]);
                this.wrap.appendChild(this.control);
            }
            // 控制栏相关元素

        }, {
            key: 'controls',
            value: function controls() {
                var self = this;
                return {
                    // 播放按钮
                    play: ce('div', { class: 'play-btn control-btn' }, [self.btns.play = ce('i', { class: 'picon picon-play', onClick: function onClick() {
                            self.togglePlay(!this.classList.contains('picon-pause'));
                        } })]),
                    // 时间显示
                    time: ce('div', { class: 'time-count' }, [self.btns.currenttime = ce('span', { class: 'currenttime' }), '/', self.btns.duration = ce('span', { class: 'duration' })]),
                    // 占位元素
                    space: ce('div', { class: 'control-space' }),
                    // 音量控制
                    voice: ce('div', { class: 'voice-control' }, [ce('div', { class: 'mute-btn control-btn' }, [self.btns.voice = ce('i', { class: 'picon picon-voice',
                        onClick: function onClick(ev) {
                            if (this.classList.contains('picon-mute')) {
                                self.volume(0.6);
                                self.btns.voiceVed.style.left = '60%';
                                self.btns.voicePoint.style.left = '60%';
                                this.classList.remove('picon-mute');
                            } else {
                                self.volume(0);
                                self.btns.voiceVed.style.left = 0;
                                self.btns.voicePoint.style.left = 0;
                                this.classList.add('picon-mute');
                            }
                        }
                    })]), ce('div', { class: 'voice-progress',
                        onMousedown: function onMousedown(ev) {
                            if (ev.button == 0) mousedown = true;
                        },
                        onMouseup: function onMouseup(ev) {
                            if (ev.button == 0) mousedown = false;
                        },
                        onClick: function onClick(ev) {
                            var vwidth = this.offsetWidth;
                            var vleft = this.getBoundingClientRect().left;
                            var left = (ev.clientX - vleft) / vwidth * 100;
                            self.btns.voicePoint.style.left = left + '%';
                            self.btns.voiceVed.style.left = left + '%';
                            if (left <= 100 && left >= 0) {
                                self.volume(left / 100);
                            }
                            self.mute(left <= 0);
                        },
                        onMousemove: function onMousemove(ev) {
                            var vleft = this.getBoundingClientRect().left;
                            var vwidth = this.offsetWidth;
                            var left = (ev.clientX - vleft) / vwidth * 100;

                            if (mousedown && left <= 100 && left >= 0) {
                                self.btns.voicePoint.style.left = left + '%';
                                self.btns.voiceVed.style.left = left + '%';
                                self.volume(left / 100);
                                self.mute(left <= 0);
                            }
                        },
                        onMouseleave: function onMouseleave(ev) {
                            if (ev.button == 0) mousedown = false;
                        }
                    }, [ce('div', { class: 'voice-progress-bar' }, [self.btns.voiceVed = ce('div', { class: 'voice-progress-ved' })]), self.btns.voicePoint = ce('label', { class: 'voice-progress-point' })])]),
                    // 速度控制
                    speed: ce('div', { class: 'play-speed' }, [self.btns.speed = ce('span', { class: 'speed-default' }, ['1.0x']), ce('div', { class: 'speed-list-wrap' }, [ce('ul', { class: 'speed-list' }, [2.0, 1.75, 1.5, 1.25, 1.0].map(function (item) {
                        return ce('li', { class: 'speed-item',
                            onClick: function onClick(ev) {
                                self.btns.speed.textContent = item + 'x';
                                self.playbackRate(item);
                            }
                        }, [item + 'x']);
                    }))])]),
                    // 全屏
                    fullscreen: ce('div', { class: 'zoomin-btn control-btn' }, [self.btns.fullscreen = ce('i', { class: 'picon picon-zoomin',
                        onClick: function onClick(ev) {
                            if (this.classList.contains('picon-zoomout')) {
                                this.classList.remove('picon-zoomout');
                                exitFullscreen(self.wrap);
                            } else {
                                this.classList.add('picon-zoomout');
                                launchFullScreen(self.wrap);
                            }
                        }
                    })]),
                    // 进度条
                    progress: ce('div', { class: 'play-progress',
                        onMousedown: function onMousedown(ev) {
                            if (ev.button == 0) mousedown = true;
                        },
                        onMouseup: function onMouseup(ev) {
                            if (ev.button == 0) mousedown = false;
                        },
                        onClick: function onClick(ev) {
                            var pleft = this.getBoundingClientRect().left;
                            var pwidth = this.offsetWidth;
                            var left = (ev.clientX - pleft) / pwidth * 100;
                            self.btns.progressPoint.style.left = left + '%';
                            self.btns.progressPlayed.style.left = left + '%';
                            self.seek.call(self, left / 100 * self.media.duration);
                        },
                        onMousemove: function onMousemove(ev) {
                            var pleft = this.getBoundingClientRect().left;
                            var pwidth = this.offsetWidth;
                            var left = (ev.clientX - pleft) / pwidth * 100;
                            self.btns.progressTips.style.left = left + '%';

                            var currentTime = left / 100 * self.media.duration;
                            self.btns.progressTips.textContent = timeCount(currentTime);
                            if (mousedown && left <= 100 && left >= 0) {
                                self.btns.progressPoint.style.left = left + '%';
                                self.btns.progressPlayed.style.left = left + '%';
                                self.seek.call(self, left / 100 * self.media.duration);
                            }
                        },
                        onMouseleave: function onMouseleave(ev) {
                            if (ev.button == 0) mousedown = false;
                        }
                    }, [ce('div', { class: 'progress-bar' }, [self.btns.progressBuffer = ce('div', { class: 'progress-buffer' }), self.btns.progressPlayed = ce('div', { class: 'progress-played' })]), self.btns.progressPoint = ce('label', { class: 'progress-point' }), self.btns.progressTips = ce('label', { class: 'progress-tips' })])
                };
            }
        }, {
            key: 'addListener',
            value: function addListener(event, listener) {
                var self = this,
                    events = event.split(' ');
                if (!this.hasOwnProperty('listeners')) {
                    this.listeners || (this.listeners = {});
                };
                events.forEach(function (event) {
                    self.listeners[event] || (self.listeners[event] = []);
                    self.listeners[event].push(listener);
                });
                return this;
            }
        }, {
            key: 'on',
            value: function on(event, listener) {
                return this.addListener(event, listener);
            }
        }, {
            key: 'once',
            value: function once(event, listener) {
                function handler() {
                    this.removeListener(event, handler);
                    return listener.apply(this, arguments);
                };
                return this.addListener(event, handler);
            }
        }, {
            key: 'removeListener',
            value: function removeListener(event, listener) {
                var self = this,
                    events = void 0,
                    listeners = void 0,
                    list = void 0;
                if (arguments.length === 0) {
                    this.listeners = {};
                    return this;
                };
                events = event.split(' ');
                events.forEach(function (event) {
                    list = (listeners = self.listeners) != null ? listeners[event] : void 0;
                    if (!list) return;
                    if (!listener) return delete self.listeners[event];
                    list.forEach(function (event, i) {
                        if (!(event === listener)) return;
                        list.splice(i, 1);
                        self.listeners[event] = list;
                    });
                });
                return this;
            }
        }, {
            key: 'off',
            value: function off(event, listener) {
                return this.removeListener(event, listener);
            }
        }, {
            key: 'listenerList',
            value: function listenerList(event) {
                return this.listeners[event];
            }
        }, {
            key: 'emit',
            value: function emit() {
                var self = this,
                    args = void 0,
                    listeners = void 0,
                    event = void 0,
                    list = void 0;
                args = arguments.length >= 1 ? [].slice.call(arguments, 0) : [];
                event = args.shift();
                list = (listeners = this.listeners) != null ? listeners[event] : void 0;
                if (!list) return;
                list.forEach(function (event) {
                    event.apply(self, args);
                });
                return true;
            }

            // 播放

        }, {
            key: 'play',
            value: function play() {
                if ('play' in this.media) {
                    this.media.play();
                    this.btns.play.classList.add('picon-pause');
                }
            }

            // 暂停

        }, {
            key: 'pause',
            value: function pause() {
                if ('pause' in this.media) {
                    this.media.pause();
                    this.btns.play.classList.remove('picon-pause');
                }
            }

            // 播放／暂停

        }, {
            key: 'togglePlay',
            value: function togglePlay(toggle) {
                toggle ? this.play() : this.pause();
                return toggle;
            }

            // 跳跃

        }, {
            key: 'seek',
            value: function seek(value) {
                this.media.currentTime = value;
                this.btns.currenttime.textContent = timeCount(value);
            }

            // 音量

        }, {
            key: 'volume',
            value: function volume(value) {
                this.media.volume = value;
            }

            // 静音

        }, {
            key: 'mute',
            value: function mute(toggle) {
                if (toggle) {
                    this.btns.voice.classList.add('picon-mute');
                } else {
                    this.btns.voice.classList.remove('picon-mute');
                }
            }

            // 速度

        }, {
            key: 'playbackRate',
            value: function playbackRate(value) {
                this.media.playbackRate = value;
            }

            // 初始化事件

        }, {
            key: 'initEvents',
            value: function initEvents() {
                var self = this;

                this.media.addEventListener('loadeddata', function () {
                    self.btns.currenttime.textContent = timeCount(this.currentTime);
                    self.btns.duration.textContent = timeCount(this.duration);
                    this.volume = 0.6;

                    // 跳转到指定位置
                    self.seek(defaults.currentTime);

                    if (defaults.autoplay) {
                        self.play();
                    }
                    if (defaults.muted) {
                        self.media.muted = false;
                        self.mute(true);
                        self.volume(0);
                        self.btns.voicePoint.style.left = '0%';
                        self.btns.voiceVed.style.left = '0%';
                    }
                });

                this.media.addEventListener('play', function () {
                    self.emit('play');
                });

                this.media.addEventListener('pause', function () {
                    self.loading.classList.remove('show');
                    self.emit('pause');
                });

                this.media.addEventListener('timeupdate', function () {
                    var length = this.buffered.length;
                    if (length > 0) {
                        var buffered = this.buffered.end(length - 1);
                        self.btns.progressBuffer.style.left = buffered / this.duration * 100 + '%';
                    }
                    self.btns.progressPoint.style.left = this.currentTime / this.duration * 100 + '%';
                    self.btns.progressPlayed.style.left = this.currentTime / this.duration * 100 + '%';
                    self.btns.currenttime.textContent = timeCount(this.currentTime);
                });

                this.media.addEventListener('click', function () {
                    self.togglePlay(this.paused);
                    self.emit('click');
                });

                this.media.addEventListener('seeking', function () {
                    self.loading.classList.add('show');
                    self.emit('seeking');
                });

                this.media.addEventListener('seeked', function () {
                    self.loading.classList.remove('show');
                    self.emit('seeked');
                });

                this.media.addEventListener('ended', function () {
                    self.pause();
                    self.emit('ended');
                });

                this.media.addEventListener('waiting', function () {
                    self.loading.classList.add('show');
                    self.emit('waiting');
                });

                this.media.addEventListener('playing', function () {
                    self.loading.classList.remove('show');
                    self.emit('playing');
                });

                this.media.addEventListener('canplaythrough', function () {
                    if (this.paused) self.loading.classList.remove('show');
                });

                this.media.addEventListener('progress', function () {
                    var length = this.buffered.length;
                    if (length > 0) {
                        var buffered = this.buffered.end(length - 1);
                        self.btns.progressBuffer.style.left = buffered / this.duration * 100 + '%';
                    }
                });

                document.addEventListener('webkitfullscreenchange', function (ev) {
                    if (document.webkitFullscreenElement) {
                        self.wrap.classList.add('fullscreen');
                    } else {
                        self.wrap.classList.remove('fullscreen');
                    }
                });

                // 控制栏显示/隐藏
                var timer = 0;
                this.wrap.addEventListener('mousemove', function () {
                    clearInterval(timer);
                    self.control.classList.add('show');
                    timer = setTimeout(function () {
                        self.control.classList.remove('show');
                    }, 5000);
                });
                this.wrap.addEventListener('mouseleave', function () {
                    self.control.classList.remove('show');
                });
            }
        }]);

        return Player;
    }();

    // 对象实例化


    return function (element, options) {
        return new Player(element, options);
    };
});