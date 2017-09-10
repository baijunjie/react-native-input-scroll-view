/**
 * @providesModule InputScrollView
 */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { View, ScrollView, Dimensions } from 'react-native';
import TextInputState from 'react-native/Libraries/Components/TextInput/TextInputState';

export default class extends Component {
    static propTypes = {
        topOffset: PropTypes.number,
        bottomOffset: PropTypes.number,
        disableAutoScroll: PropTypes.bool,
    };

    static defaultProps = {
        topOffset: 0,
        bottomOffset: 0,
        disableAutoScroll: false,
    };

    componentWillMount() {
        this._keyboardShow = false;
    }

    render() {
        const { children, otherProps } = this.props;
        return (
            <ScrollView ref="scrollView"
                        keyboardShouldPersistTaps="handled"
                        onFocus={this._onFocus}
                        onContentSizeChange={this._scrollToKeyboard}
                        onKeyboardDidShow={this._onKeyboardDidShow}
                        onKeyboardWillHide={this._onKeyboardWillHide} {...otherProps}>
                <View onStartShouldSetResponderCapture={this._onStartShouldSetResponderCapture}>
                    {children}
                </View>
            </ScrollView>
        );
    }

    _scrollToKeyboard = () => {
        // 当 ScrollView 的 ContentSize 不是因为多行文本输入而发生变化时，会导致这里错误的执行
        // 因此使用 disableAutoScroll 来控制它是否自动滚动
        if (this.props.disableAutoScroll || !this._keyboardShow) return;
        const curFocusTarget = TextInputState.currentlyFocusedField();
        if (!curFocusTarget) return;
        const scrollView = this.refs.scrollView;
        scrollView &&
        scrollView.scrollResponderScrollNativeHandleToKeyboard(curFocusTarget, 80, true);
    };

    _onKeyboardDidShow = (event) => {
        const keyboardHeight = Dimensions.get('window').height - event.endCoordinates.screenY;
        this._setScrollViewContentBottomInset(keyboardHeight);

        if (this._keyboardShow) return;
        this._keyboardShow = true;
        // 如果 keyboardStatus 为 true，则说明在 onFocus 事件已经处理过了，这里无需在进行处理
        this._scrollToKeyboard();
    };

    _onKeyboardWillHide = () => {
        this._keyboardShow = false;
        this._setScrollViewContentBottomInset(this.props.bottomOffset);
        this._scrollToEnd();
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

    _setScrollViewContentBottomInset(bottomInset) {
        const scrollView = this.refs.scrollView;
        scrollView &&
        scrollView.setNativeProps({
            contentInset : {
                left: 0,
                right: 0,
                top: scrollView.props.automaticallyAdjustContentInsets === false ? 0 : -this.props.topOffset,
                bottom: bottomInset - this.props.bottomOffset
            }
        });
    }

    _scrollToEnd() {
        const scrollView = this.refs.scrollView;
        scrollView &&
        scrollView.scrollToEnd({animated: true});
    }
}
