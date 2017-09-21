/**
 * @providesModule InputScrollView
 * @author Junjie.Bai
 * @license MIT
 */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { View, ScrollView, Keyboard, Dimensions, Animated } from 'react-native';
import TextInputState from 'react-native/Libraries/Components/TextInput/TextInputState';
import { getInstanceFromNode } from 'react-native/Libraries/Renderer/shims/ReactNativeComponentTree';

export default class extends Component {
    static propTypes = {
        topOffset: PropTypes.number,
        bottomOffset: PropTypes.number,
        keyboardOffset: PropTypes.number,
        getMultiLineInputHandles: PropTypes.func,
    };

    static defaultProps = {
        topOffset: 0,
        bottomOffset: 0,
        keyboardOffset: 40,
        getMultiLineInputHandles: null,
    };

    componentWillMount() {
        this._root = null;

        this._scrollViewBottomOffset = new Animated.Value(0);
        this._contentBottomOffset = new Animated.Value(0);

        this._keyboardTop = null;
        this._inputInfoMap = {};

        this.props.getMultiLineInputHandles &&
        this.props.getMultiLineInputHandles({
            onSelectionChange: this._onSelectionChange,
            onContentSizeChange: this._onContentSizeChange,
        });

        this._addListener();
        this._extendScrollViewFunc();
    }

    componentWillUnmount() {
        this._removeListener();
    }

    render() {
        const {
            bottomOffset,
            keyboardOffset,
            getMultiLineInputHandles,
            children,
            ...otherProps
        } = this.props;

        return (
            <Animated.View style={{ flex: 1, marginBottom: this._scrollViewBottomOffset }}>
                <ScrollView ref={r => this._root = r}
                            onFocusCapture={this._onFocus} {...otherProps}>
                    <Animated.View style={{ marginBottom: this._contentBottomOffset }}
                                   onStartShouldSetResponderCapture={this._onStartShouldSetResponderCapture}>
                        {children}
                    </Animated.View>
                </ScrollView>
            </Animated.View>
        );
    }

    _scrollToKeyboardRequire = (force) => {
        if (!this._keyboardTop) return;

        const curFocusTarget = TextInputState.currentlyFocusedField();
        if (!curFocusTarget) return;

        const inputInfo = this._inputInfoMap[curFocusTarget];

        if (!inputInfo || !inputInfo.height) {
            return this._scrollToKeyboard(curFocusTarget, 0);
        }

        const input = getInstanceFromNode(curFocusTarget);
        input.measure((x, y, width, height, left, top) => {
            const paddingBottom = (height - inputInfo.height) * .5;
            const bottom = top + height;
            const cursorRelativeBottomOffset = (inputInfo.cursorRelativeBottomOffset || 0) + paddingBottom;
            const cursorPosition = bottom - cursorRelativeBottomOffset;

            if (force || cursorPosition > this._keyboardTop - this.props.keyboardOffset) {
                this._scrollToKeyboard(curFocusTarget, cursorRelativeBottomOffset);
            }
        });
    };

    _scrollToKeyboard = (target, offset) => {
        const toKeyboardOffset = this.props.topOffset + this.props.keyboardOffset - offset;
        this._root.scrollResponderScrollNativeHandleToKeyboard(target, toKeyboardOffset, true);
    };

    _onKeyboardShow = (event) => {
        this._keyboardTop = event.endCoordinates.screenY;
        const keyboardHeight = Math.max(0, Dimensions.get('window').height - this._keyboardTop);
        this._scrollViewBottomOffset.setValue(keyboardHeight - this.props.bottomOffset);
        this._contentBottomOffset.setValue(this.props.keyboardOffset);
    };

    _onKeyboardHide = () => {
        this._keyboardTop = null;
        this._animate(this._scrollViewBottomOffset, 0);
        this._animate(this._contentBottomOffset, 0);
    };

    // 这个方法是为了防止 ScrollView 在滑动结束后触发 TextInput 的 focus 事件
    _onStartShouldSetResponderCapture = ({...event}) => {
        if (event.target === TextInputState.currentlyFocusedField()) return false;
        const uiViewClassName = event._targetInst.viewConfig.uiViewClassName;
        if (uiViewClassName !== 'RCTTextField' && uiViewClassName !== 'RCTTextView') {
            return false;
        }
        return true;
    };

    // _onFocus 在 keyboardWillShow 之后触发，在 keyboardDidShow 之前触发
    _onFocus = ({nativeEvent:event}) => {
        // 当 onStartShouldSetResponderCapture 返回 true 时
        // 被激活的 TextInput 无法使用 Keyboard.dismiss() 来收起键盘
        // TextInputState.currentlyFocusedField() 也无法获取当前焦点ID
        // 原因可能是系统并未判定 TextInput 获取焦点，这可能是一个 bug
        // 通常需要在 onStartShouldSetResponderCapture 返回 false 的情况下再点击一次 TextInput 才能恢复正常
        // 所以这里手动再设置一次焦点
        TextInputState.focusTextInput(event.target);

        // 确保 _scrollToKeyboardRequire 在 onSelectionChange 之后执行
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                this._scrollToKeyboardRequire();
            });
        });
    };

    // onSelectionChange 在 onFocus 之后，在 keyboardDidShow 之前触发
    // onSelectionChange 在 onContentSizeChange 之前触发
    _onSelectionChange = ({nativeEvent:event}) => {
        // 使用异步使 onSelectionChange 在 onContentSizeChange 之后执行
        setTimeout(() => {
            const inputInfo = this._inputInfoMap[event.target];
            if (!inputInfo || !inputInfo.height) return;

            const text = getInstanceFromNode(event.target)._currentElement.props.value;
            if (typeof text !== 'string') return;

            const cursorPosition = event.selection.end;
            inputInfo.cursorRelativeBottomOffset = calcOffset(inputInfo.height, getLineCount(text), getLineCount(text.substr(0, cursorPosition)));
        });
    };

    _onContentSizeChange = ({nativeEvent:event}) => {
        const inputInfo = this._inputInfoMap[event.target] = this._inputInfoMap[event.target] || {};
        inputInfo.height = event.contentSize.height;

        // 使用异步保证 scrollToKeyboardRequire 在 onSelectionChange 之后执行
        setTimeout(() => {
            this._scrollToKeyboardRequire(true);
        });
    };

    _addListener() {
        this._keyboardShowListener = Keyboard.addListener('keyboardWillShow', this._onKeyboardShow);
        this._keyboardHideListener = Keyboard.addListener('keyboardWillHide', this._onKeyboardHide);
    }

    _removeListener() {
        this._keyboardShowListener && this._keyboardShowListener.remove();
        this._keyboardHideListener && this._keyboardHideListener.remove();
        this._keyboardShowListener = null;
        this._keyboardHideListener = null;
    }

    _extendScrollViewFunc() {
        const funcArray = [
            'scrollTo',
            'scrollToEnd',
        ];

        funcArray.forEach(funcName => {
            this[funcName] = (...args) => {
                this._root[funcName](...args);
            };
        });
    }

    _animate(props, toValue) {
        Animated.timing(props, { toValue, duration: 250 }).start();
    }
}

function calcOffset(height, totalLine, curLine) {
    return height / totalLine * (totalLine - curLine);
}

function getLineCount(text) {
    return text.split('\n').length;
}
