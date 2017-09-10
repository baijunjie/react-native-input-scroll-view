/**
 * @providesModule InputScrollView
 */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { View, ScrollView, Keyboard, Dimensions, Animated } from 'react-native';
import TextInputState from 'react-native/Libraries/Components/TextInput/TextInputState';
import { getInstanceFromNode } from 'react-native/Libraries/Renderer/shims/ReactNativeComponentTree';

const baseOffset = 80;

export default class extends Component {
    static propTypes = {
        bottomOffset: PropTypes.number,
        keyboardOffset: PropTypes.number,
        getMultiLineInputHandles: PropTypes.func,
    };

    static defaultProps = {
        bottomOffset: 0,
        keyboardOffset: 0,
        getMultiLineInputHandles: null,
    };

    componentWillMount() {
        this._root = null;

        this._scrollViewBottomOffset = new Animated.Value(0);
        this._contentBottomOffset = new Animated.Value(0);

        this._keyboardShow = false;
        this._inputInfoMap = {};

        this._keyboardDidShowListener = null;
        this._keyboardWillHideListener = null;

        this.props.getMultiLineInputHandles &&
        this.props.getMultiLineInputHandles({
            onSelectionChange: this._onSelectionChange,
            onContentSizeChange: this._onContentSizeChange
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
            style,
            children,
            ...otherProps
        } = this.props;

        return (
            <Animated.ScrollView ref={r => this._root = r && r._component}
                        style={[{ marginBottom: this._scrollViewBottomOffset }, style]}
                        onFocusCapture={this._onFocus} {...otherProps}>
                <Animated.View style={{ marginBottom: this._contentBottomOffset }}
                      onStartShouldSetResponderCapture={this._onStartShouldSetResponderCapture}>
                    {children}
                </Animated.View>
            </Animated.ScrollView>
        );
    }

    _scrollToKeyboard = () => {
        if (!this._keyboardShow) return;

        const curFocusTarget = TextInputState.currentlyFocusedField();
        if (!curFocusTarget) return;

        const curTargetInputInfo = this._inputInfoMap[curFocusTarget];
        const cursorOffset = curTargetInputInfo && curTargetInputInfo.cursorOffset || 0;
        const toKeyboardOffset = baseOffset + this.props.keyboardOffset - cursorOffset;

        this._root.scrollResponderScrollNativeHandleToKeyboard(curFocusTarget, toKeyboardOffset, true);
    };

    _onKeyboardDidShow = (event) => {
        // 如果 _keyboardShow 为 true，则说明在 onFocus 事件已经处理过了，这里无需在进行处理
        if (this._keyboardShow) return;
        this._keyboardShow = true;

        this._scrollToKeyboard();

        const keyboardHeight = Dimensions.get('window').height - event.endCoordinates.screenY;

        this._animate(this._scrollViewBottomOffset, keyboardHeight - this.props.bottomOffset);
        this._animate(this._contentBottomOffset, this.props.keyboardOffset);
    };

    _onKeyboardWillHide = () => {
        this._keyboardShow = false;

        this._animate(this._scrollViewBottomOffset, 0);
        this._animate(this._contentBottomOffset, 0);
    };

    _onFocus = ({nativeEvent:event}) => {
        // 当 onStartShouldSetResponderCapture 返回 true 时
        // 被激活的 TextInput 无法使用 Keyboard.dismiss() 来收起键盘
        // TextInputState.currentlyFocusedField() 也无法获取当前焦点ID
        // 原因可能是系统并未判定 TextInput 获取焦点，这可能是一个 bug
        // 通常需要在 onStartShouldSetResponderCapture 返回 false 的情况下再点击一次 TextInput 才能恢复正常
        // 所以这里手动再设置一次焦点
        TextInputState.focusTextInput(event.target);
        this._scrollToKeyboard();
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

    _onSelectionChange = ({nativeEvent:event}) => {
        const inputInfo = this._inputInfoMap[event.target];
        if (!inputInfo || !inputInfo.height) return;

        const text = getInstanceFromNode(event.target)._currentElement.props.value;
        if (!text) return;

        const cursorPosition = event.selection.start;
        inputInfo.cursorOffset = calcOffset(inputInfo.height, getLineCount(text), getLineCount(text.substr(0, cursorPosition)));
    };

    _onContentSizeChange = ({nativeEvent:event}) => {
        const inputInfo = this._inputInfoMap[event.target] = this._inputInfoMap[event.target] || {};
        inputInfo.height = event.contentSize.height;
        this._scrollToKeyboard();
    };

    _addListener() {
        this._keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', this._onKeyboardDidShow);
        this._keyboardWillHideListener = Keyboard.addListener('keyboardWillHide', this._onKeyboardWillHide);
    }

    _removeListener() {
        this._keyboardDidShowListener && this._keyboardDidShowListener.remove();
        this._keyboardWillHideListener && this._keyboardWillHideListener.remove();
        this._keyboardDidShowListener = null;
        this._keyboardWillHideListener = null;
    }

    _extendScrollViewFunc() {
        const funcArray = [
            'scrollTo',
            'scrollToEnd',
        ];

        funcArray.forEach(funcName => {
            this[funcName] = () => {
                this._root[funcName]();
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
