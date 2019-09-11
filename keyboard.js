(function (exports) {
    'use strict';
    var tool = {
        isDom: function (obj) {
            var type = false;
            if (typeof HTMLElement === 'object') {
                type = obj instanceof HTMLElement;
            } else {
                type = obj && typeof obj === 'object' && obj.nodeType === 1 && typeof obj.nodeName === 'string';
            }
            return type ? obj : document.querySelector(obj);
        }
    };
    var KeyBoard = function (options) {
        this.options = {
            // 挂载dom
            mountDom: tool.isDom(options.mountDom),
            // 输入框
            inputDom: tool.isDom(options.inputDom || '.custom-input'),
            // 默认输入框
            nativeInputDom: tool.isDom(options.nativeInputDom || ".input"),
            // 需要焦点的元素
            inputFocus: function () {
                var inputFocusArray = [];
                if (options.inputFocus) {
                    options.inputFocus.forEach(function (item) {
                        inputFocusArray.push(tool.isDom(item));
                    });
                }
                return inputFocusArray;
            }(),
            // 输入框允许最多字符
            maxLength: options.maxLength || 20,
            // 默认光标
            cursor: options.cursor || ".",
            // 回调数据
            callback: options.callback,
            // focus
            focus: options.focus,
            blur: options.blur,
            // placehoder
            placeHolder: options.placeHolder || '',
            // 键盘布局数据
            keyboardConfig: [
                [{
                    value: '940',
                    key: '940'
                }, {
                    value: '94',
                    key: '94'
                }, {
                    value: '空格',
                    key: '&nbsp;'
                }, {
                    value: '中文',
                    key: 'cn'
                }],
                [{
                    value: '1',
                    key: '1'
                }, {
                    value: '4',
                    key: '4'
                }, {
                    value: '7',
                    key: '7'
                }, {
                    value: '000',
                    key: '000'
                }],
                [{
                    value: '2',
                    key: '2'
                }, {
                    value: '5',
                    key: '5'
                }, {
                    value: '8',
                    key: '8'
                }, {
                    value: '00',
                    key: '00'
                }],
                [{
                    value: '3',
                    key: '3'
                }, {
                    value: '6',
                    key: '6'
                }, {
                    value: '9',
                    key: '9'
                }, {
                    value: '0',
                    key: '0'
                }],
                [{
                    value: '删除',
                    key: 'backspace'
                }, {
                    value: '搜索',
                    key: 'search'
                }],
            ]
        };

        // 保存输入框数据 默认有一个光标
        this.data = [this.options.cursor];
        // 渲染键盘
        this.renderKeyboard();
        // 渲染到输入框
        this.toInputHtml();
        // 监听事件
        this.bindEvent();
    };
    KeyBoard.prototype = {
        bindEvent: function () {
            var _this = this;
            // 主键盘模块
            this.$keyboard = document.querySelector(".custom-keyborad");
            this.$keyboardBox = this.$keyboard.querySelector('.keyboard-box');
            this.$keyboardMask = this.$keyboard.querySelector('.keyboard-mask');
            // 自定义输入框
            this.$input = this.options.inputDom;
            // 原生输入框
            this.$nativeInput = this.options.nativeInputDom;
            // 键盘高度
            this.keyboardH = parseFloat(getComputedStyle(this.$keyboard).height);

            // 因为穿透导致安卓获取不到输入框焦点补丁
            this.$keyboardBox.addEventListener("click", function () {
                _this.$nativeInput.focus();
            }, false);
            // 因为穿透导致安卓获取不到输入框焦点补丁
            this.$keyboardMask.addEventListener('click', function () {
                _this.$nativeInput.focus();
            }, false);
            // 监听事件 判断 键盘是否弹出
            document.addEventListener("touchstart", function (event) {
                var $target = event.target;
                // inputFocus 包含的元素被点击到什么 都不操作
                for (var i = 0; i < _this.options.inputFocus.length; i++) {
                    var $item = _this.options.inputFocus[i];
                    if ($item.contains($target)) {
                        return;
                    }
                }

                // 如果点击区域是键盘进行按键的相应操作
                if (_this.$keyboard.contains($target)) {
                    var key = $target.getAttribute("key");
                    if (key) {
                        _this.switch(key);
                    }
                    return;
                }

                // 判断点击区域是自定义输入框进行光标的位置改变
                if (_this.$input.contains($target)) {
                    // 需要弹出键盘
                    _this.show();
                    // 内容数组
                    var lists = Array.prototype.slice.call(
                        _this.$input.querySelectorAll('span')
                    );
                    // 获取焦点位置
                    var index = lists.indexOf($target);
                    // 判断有没有焦点
                    if (_this.getPointIndex() === -1) {
                        _this.data.push(_this.options.cursor);
                    }
                    // 没有点击到输入内容并且点击范围不是内容区域
                    if (index === -1 && $target.className != "value") {
                        index = lists.length - 1;
                    }
                    // 移动焦点显示位置
                    _this.moveArray(_this.data, [_this.getPointIndex()], index, 1);
                    // 更新显示输入框
                    _this.toInputHtml();
                    // 执行焦点函数
                    if (_this.options.focus) {
                        _this.options.focus();
                    }
                    return;
                }

                // 判断点击区域原生输入框不操作
                if (_this.$nativeInput.contains($target)) {
                    return;
                }
                // 去焦点
                _this.blur();
                // 隐藏键盘
                _this.hide();
                _this.$nativeInput.blur();
                // 执行失焦函数
                if (_this.options.blur) {
                    _this.options.blur();
                }
            }, false);
        },
        // 失去焦点
        blur: function () {
            var pointIndex = this.getPointIndex();
            if (pointIndex != -1) {
                this.data.splice(pointIndex, 1);
            }
            this.toInputHtml();
        },
        // 获取焦点
        focus: function () {
            if (this.getPointIndex() === -1) {
                this.data.push(this.options.cursor);
            }
            this.toInputHtml();
        },
        /* 移动到相应位置 */
        moveArray: function (arr, moveIndsArr, moveToInd, isBeforAfter) {
            var temp = [];
            moveIndsArr.sort(function (x, y) {
                return x - y;
            });
            moveToInd += isBeforAfter;
            for (var i = 0; i < moveIndsArr.length; i++) {
                if (moveIndsArr[i] < moveToInd) {
                    moveToInd -= 1;
                }
                temp[temp.length] = arr.splice(moveIndsArr[i] - i, 1)[0];
            }
            temp.unshift(moveToInd, 0);
            Array.prototype.splice.apply(arr, temp);
        },
        /* 功能选择 */
        switch: function (key) {
            var _this = this;
            switch (key) {
                case 'backspace':
                    // 得到焦点位置
                    var pointIndex = this.getPointIndex();
                    if (this.data.length > 1 && pointIndex != 0) {
                        _this.data.splice(pointIndex - 1, 1);
                    }
                    break;
                case 'cn':
                    this.hide();
                    break;
                case 'search':
                    this.hide();
                    break;
                default:
                    key.split('').forEach(function (value) {
                        // 输入框最多显示的
                        if (_this.data.length > _this.options.maxLength) {
                            return;
                        }
                        _this.data.splice(_this.getPointIndex(), 0, value);
                    });
            }

            // 执行回调
            if (this.options.callback) {
                this.options.callback({
                    key: key,
                    data: this.getInputValue()
                }, this);
            }
            this.toInputHtml();
        },
        // 显示系统键盘
        showSystemKeyboard: function () {
            // 判断是IOS
            if (navigator.appVersion.toLocaleLowerCase().indexOf("iphone") > 0 ||
                appVersion.indexOf("ipad") > 0) {
                // 获取焦点
                this.$nativeInput.focus();
                // 输入框 数据 显示 
                this.$nativeInput.value = this.getInputValue();
            }
        },
        // 返回输入框中应该的数据
        getInputValue: function () {

            var value = JSON.parse(
                JSON.stringify(this.data)
            );

            value.splice(
                this.getPointIndex(),
                1
            );
            return value.join('');
        },
        // 获取 点位置 
        getPointIndex: function () {
            return this.data.indexOf(this.options.cursor);
        },
        /* 转换成html */
        toInputHtml: function () {
            var _this = this;
            var htmlArray = [];
            // 组合 html 数组
            this.data.forEach(function (value) {
                if (value === _this.options.cursor) {
                    htmlArray.push('<span class="blinker"></span>');
                } else {
                    htmlArray.push('<span>' + value.replace(/\s/g, "&nbsp;") + '</span>');
                }
            });
            // 判断是否显示 占位符
            var placeHolder = function () {
                var len = 0;
                if (_this.getPointIndex() != -1) {
                    len = 1;
                }
                return (htmlArray.length > len ? '' : _this.options.placeHolder);
            }();
            var html = '<div class="value">' + htmlArray.join('') +
                '</div><div class="placeholder">' + placeHolder.replace(/\s/g, "&nbsp;") + '</div>';
            // 渲染页面
            this.renderInput(html);
        },
        /* 页面渲染 */
        renderInput: function (value) {
            this.options.inputDom.innerHTML = value;
        },
        /* 渲染 键盘*/
        renderKeyboard: function () {
            var html = '<div class="keyboard-mask"></div><div class="keyboard-box">';
            this.options.keyboardConfig.forEach(function (items) {
                html += '<ul class="item">';
                items.forEach(function (item) {
                    html += '<li class="li" key="' + item.key + '">' + item.value + '</li>';
                });
                html += '</ul>';
            });
            html += '</div>';
            var $customKeyboard = document.createElement('DIV');
            $customKeyboard.className = 'custom-keyborad';
            $customKeyboard.innerHTML = html;
            this.options.mountDom.appendChild($customKeyboard);
        },
        /* 清除输入框内容 */
        clearInput: function () {
            this.data = [this.options.cursor];
            this.toInputHtml();
        },
        // 输入框内容设置值
        setValue: function (data) {
            this.data = [this.options.cursor];
            this.data = data.split('').concat(this.data);
            this.toInputHtml();
        },
        show: function () {
            this.$keyboard.style.height = this.keyboardH + 'px';
            this.$keyboardMask.removeAttribute('hidden');

        },
        /*隐藏 */
        hide: function () {
            var _this = this;
            this.$keyboard.style.height = '0px';
            if (window.keyboardMaskTimer) {
                clearTimeout(window.keyboardMaskTimer);
            }
            window.keyboardMaskTimer = setTimeout(function () {
                _this.$keyboardMask.setAttribute('hidden', 'hidden');
            }, 500);
        }
    };

    exports.KeyBoard = KeyBoard;
}(window));
