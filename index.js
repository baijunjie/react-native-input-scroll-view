/**
 * @providesModule InputScrollView
 * @author Junjie.Bai
 * @license MIT
 */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
    StyleSheet,
    View,
    ScrollView,
    TextInput,
    KeyboardAvoidingView,
    Keyboard,
    Platform,
    Dimensions,
} from 'react-native';
import TextInputState from 'react-native/Libraries/Components/TextInput/TextInputState';
import { getInstanceFromNode } from 'react-native/Libraries/Renderer/shims/ReactNativeComponentTree';

export default class extends Component {
    static propTypes = {
        topOffset: PropTypes.number,
        keyboardOffset: PropTypes.number,
        getMultilineInputHandles: PropTypes.func,
        multilineInputStyle: PropTypes.oneOfType([
            PropTypes.object,
            PropTypes.array,
            PropTypes.number,
        ]),
    };

    static defaultProps = {
        topOffset: 0,
        keyboardOffset: 40,
        getMultilineInputHandles: null,
        multilineInputStyle: { fontSize: 17 },
    };

    state = {
        measureInputValue: '',
        measureInputWidth: 0,
        contentBottomOffset: 0,
    };

    componentWillMount() {
        this._root = null;
        this._moved = false;
        this._measureCallback = null;
        this._keyboardTop = null;
        this._inputInfoMap = {};

        this.props.getMultilineInputHandles &&
        this.props.getMultilineInputHandles({
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
            topOffset,
            keyboardOffset,
            getMultilineInputHandles,
            multilineInputStyle,
            children,
            ...otherProps,
        } = this.props;

        const {
            measureInputValue,
            measureInputWidth,
            contentBottomOffset,
        } = this.state;

        return (
            <KeyboardAvoidingView behavior="padding">
                <View style={styles.wrap}>
                    <ScrollView ref={r => this._root = r}
                                onMomentumScrollEnd={this._onMomentumScrollEnd}
                                onFocusCapture={this._onFocus} {...otherProps}>
                        <View style={{ marginBottom: contentBottomOffset }}
                              onStartShouldSetResponderCapture={this._onTouchStart}
                              onResponderMove={this._onTouchMove}
                              onResponderRelease={this._onTouchEnd}>
                            {children}
                            <View style={styles.hidden}
                                  pointerEvents="none">
                                <TextInput style={[multilineInputStyle, { width: measureInputWidth }]}
                                           value={measureInputValue}
                                           onContentSizeChange={this._onContentSizeChangeMeasureInput}
                                           editable={false}
                                           multiline />
                            </View>
                        </View>
                    </ScrollView>
                </View>
            </KeyboardAvoidingView>
        );
    }

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

    _getInputInfo(target) {
        return this._inputInfoMap[target] = this._inputInfoMap[target] || {};
    }

    _measureCursorPosition(text, width, callback) {
        this._measureCallback = callback;
        this.setState({
            measureInputValue: text,
            measureInputWidth: width,
        });
    }

    _onContentSizeChangeMeasureInput = debounce(event => {
        if (!this._measureCallback) return;
        this._measureCallback(event.contentSize.height);
        this._measureCallback = null;
        this.setState({
            measureInputValue: '',
            measureInputWidth: 0,
        });
    });

    _onMomentumScrollEnd = ({nativeEvent:event}) => {
        if (!this._keyboardTop) return;
        const contentBottomOffset = Math.max(
            0,
            this.state.contentBottomOffset +
            event.layoutMeasurement.height + // layoutMeasurement 可视区域的大小
            event.contentOffset.y -
            event.contentSize.height
        );
        this.setState({ contentBottomOffset });
    };

    _scrollToKeyboardRequest = (force) => {
        if (!this._keyboardTop) return;

        const curFocusTarget = TextInputState.currentlyFocusedField();
        if (!curFocusTarget) return;

        const inputInfo = this._inputInfoMap[curFocusTarget];
        if (!inputInfo) return this._scrollToKeyboard(curFocusTarget, 0);

        this._measureCursorPosition(
            inputInfo.textBeforeCursor,
            inputInfo.width,
            cursorRelativeTopOffset => {
                const cursorRelativeBottomOffset = Math.max(0, inputInfo.height - cursorRelativeTopOffset);
                const input = getInstanceFromNode(curFocusTarget);
                input.measure((x, y, width, height, left, top) => {
                    const bottom = top + height;
                    const cursorPosition = bottom - cursorRelativeBottomOffset;
                    if (force || cursorPosition > this._keyboardTop - this.props.keyboardOffset) {
                        this._scrollToKeyboard(curFocusTarget, cursorRelativeBottomOffset);
                    }
                });
            },
        );
    };

    _scrollToKeyboard = (target, offset) => {
        const toKeyboardOffset = this.props.topOffset + this.props.keyboardOffset - offset;
        this._root.scrollResponderScrollNativeHandleToKeyboard(target, toKeyboardOffset, true);
    };

    _onKeyboardShow = (event) => {
        this._keyboardTop = event.endCoordinates.screenY;
    };

    _onKeyboardHide = () => {
        this._keyboardTop = null;
        this.setState({ contentBottomOffset: 0 });
    };

    // 这个方法是为了防止 ScrollView 在滑动结束后触发 TextInput 的 focus 事件
    _onTouchStart = ({...event}) => {
        if (event.target === TextInputState.currentlyFocusedField()) return false;

        let uiViewClassName;
        if (Platform.OS === 'ios') {
            uiViewClassName = event._targetInst.viewConfig.uiViewClassName;
            return uiViewClassName === 'RCTTextField' || uiViewClassName === 'RCTTextView';
        } else {
            uiViewClassName = typeof event._targetInst._currentElement === 'object' &&
                event._targetInst._currentElement.type.displayName;
            return uiViewClassName === 'AndroidTextInput';
        }
    };

    _onTouchMove = ({...event}) => {
        this._moved = true;
    };

    _onTouchEnd = ({...event}) => {
        if (this._moved) {
            this._moved = false;
        } else {
            TextInputState.focusTextInput(event.target);
        }
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

        // 确保 _scrollToKeyboardRequest 在 onSelectionChange 之后执行
        setTimeout(() => {
            this._scrollToKeyboardRequest();
        }, 100);
    };

    // onSelectionChange 在 onFocus 之后，在 keyboardDidShow 之前触发
    // onSelectionChange 在 onContentSizeChange 之前触发
    _onSelectionChange = ({nativeEvent:event}) => {
        // 当 onSelectionChange 执行时，输入元素的 value 值可能还没有被更新
        // 这里的延迟确保输入元素的 value 已经被更新
        // 在 release 版本中必须使用 requestAnimationFrame
        requestAnimationFrame(() => {
            const text = getInstanceFromNode(event.target)._currentElement.props.value;
            if (typeof text !== 'string') return;

            const inputInfo = this._getInputInfo(event.target);
            inputInfo.textBeforeCursor = text.substr(0, event.selection.end);
        });
    };

    // 使用防抖函数有两个目的
    // - 确保 scrollToKeyboardRequest 在 onSelectionChange 之后执行
    // - 短时间内不会重复执行 onContentSizeChange
    _onContentSizeChange = debounce(event => {
        const inputInfo = this._getInputInfo(event.target);
        inputInfo.width = event.contentSize.width;
        inputInfo.height = event.contentSize.height;
        this._scrollToKeyboardRequest(true);
    });
}

function debounce(func) {
    let id;
    return function({nativeEvent:event}) {
        cancelAnimationFrame(id);
        id = requestAnimationFrame(() => {
            id = requestAnimationFrame(() => {
                id = null;
                func.call(this, event);
            });
        });
    };
}

const styles = StyleSheet.create({
    wrap: {
        height: '100%',
    },

    hidden: {
        position: 'absolute',
        top: 0,
        left: 0,
        opacity: 0,
    },
});
