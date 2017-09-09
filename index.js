/**
 * @providesModule InputScrollView
 */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
    View,
    ScrollView,
    Dimensions,
} from 'react-native';
import TextInputState from 'react-native/Libraries/Components/TextInput/TextInputState';

export default class extends Component {
    static propTypes = {
        lock: PropTypes.bool,
        topOffset: PropTypes.number,
        bottomOffset: PropTypes.number,
    };

    static defaultProps = {
        lock: false,
        topOffset: 0,
        bottomOffset: 0,
    };

    componentWillMount() {
        this._keyboardShow = false;
        this._curFocusTarget = null;
    }

    render() {
        const { children, otherProps } = this.props;
        return (
            <ScrollView ref="scrollView"
                        keyboardShouldPersistTaps="handled"
                        onFocus={this._onFocus}
                        onBlur={this._onBlur}
                        onContentSizeChange={this._scrollToKeyboard}
                        onKeyboardDidShow={this._onKeyboardDidShow}
                        onKeyboardWillHide={this._onKeyboardWillHide} {...otherProps}>
                <View onStartShouldSetResponderCapture={this._onStartShouldSetResponderCapture}>
                    {children}
                </View>
            </ScrollView>
        );
    }

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

    _scrollToKeyboard = () => {
        // 当 ScrollView 的 ContentSize 不是因为多行文本输入而发生变化时，会导致这里错误的执行
        // 因此需要使用一个属性将其锁住
        if (this.props.lock || !this._curFocusTarget || !this._keyboardShow) return;
        const scrollView = this.refs.scrollView;
        scrollView &&
        scrollView.scrollResponderScrollNativeHandleToKeyboard(this._curFocusTarget, 80, true);
    };

    _onFocus = ({nativeEvent:event}) => {
        this._curFocusTarget = event.target;
        this._scrollToKeyboard();
    };

    _onBlur = () => {
        this._curFocusTarget = null;
    };

    // 这个方法是为了防止 ScrollView 在滑动结束后触发 TextInput 的 focus 事件
    _onStartShouldSetResponderCapture = ({...event}) => {
        if (this._curFocusTarget) {
            const uiViewClassName = event._targetInst.viewConfig.uiViewClassName;
            if (uiViewClassName !== 'RCTTextField' && uiViewClassName !== 'RCTTextView') {
                TextInputState.focusTextInput(this._curFocusTarget);
                TextInputState.blurTextInput(this._curFocusTarget);
            }
            return false;
        }

        // 当返回 true 时
        // 被激活的 TextInput 无法使用 Keyboard.dismiss() 来收起键盘
        // TextInputState.currentlyFocusedField() 也无法获取当前焦点ID
        // 因此任然需要依靠 _curFocusTarget 变量来记录当前焦点
        return true;
    };
}
