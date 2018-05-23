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
    Animated,
    UIManager,
} from 'react-native';

const isIOS = Platform.OS === 'ios';

let debounce;

if (isIOS) {
    debounce = function(func, wait) {
        wait = wait || 0;
        let id, count;
        let action = function(event) {
            if (count) {
                count--;
                id = requestAnimationFrame(() => action.call(this, event));
            } else {
                func.call(this, event);
            }
        };
        return function({ ...event }) {
            cancelAnimationFrame(id);
            count = wait;
            action.call(this, event);
        };
    };
} else {
    debounce = function(func, wait) {
        wait = wait || 0;
        let id, count;
        let action = function(event) {
            if (count) {
                count--;
                id = setTimeout(() => action.call(this, event));
            } else {
                func.call(this, event);
            }
        };
        return function({ ...event }) {
            clearTimeout(id);
            count = wait;
            action.call(this, event);
        };
    };
}

export default class extends Component {
    static propTypes = {
        keyboardOffset: PropTypes.number,
        multilineInputStyle: PropTypes.oneOfType([
            PropTypes.object,
            PropTypes.array,
            PropTypes.number,
        ]),
        useAnimatedScrollView: PropTypes.bool,
    };

    static defaultProps = {
        keyboardOffset: 40,
        multilineInputStyle: null,
        useAnimatedScrollView: false,
    };

    state = {
        measureInputVisible: false,
        measureInputValue: '',
        measureInputWidth: 0,
        contentBottomOffset: 0,
    };

    componentWillMount() {
        this._root = null;
        this._measureCallback = null;
        this._keyboardShow = false;
        this._topOffset = 0;
        this._inputInfoMap = {};

        this._addListener();
        this._extendScrollViewFunc();
    }

    componentWillUnmount() {
        this._removeListener();
    }

    render() {
        const {
            keyboardOffset,
            multilineInputStyle,
            children,
            useAnimatedScrollView,
            ...otherProps,
        } = this.props;

        const {
            measureInputVisible,
            measureInputValue,
            measureInputWidth,
            contentBottomOffset,
        } = this.state;

        const newChildren = this._cloneDeepComponents(children);

        const ScrollComponent = useAnimatedScrollView ? Animated.ScrollView : ScrollView;

        return (
            <KeyboardAvoidingView behavior={isIOS ? 'padding' : null}>
                <View style={styles.wrap}>
                    <ScrollComponent ref={this._onRef}
                                     onMomentumScrollEnd={this._onMomentumScrollEnd}
                                     onFocusCapture={this._onFocus} {...otherProps}>
                        <View style={{ marginBottom: contentBottomOffset }}
                              onStartShouldSetResponderCapture={isIOS ? this._onTouchStart : null}
                              onResponderMove={this._onTouchMove}
                              onResponderRelease={this._onTouchEnd}>
                            {newChildren}
                            <View style={styles.hidden}
                                  pointerEvents="none">
                                {
                                    measureInputVisible &&
                                    <TextInput style={[multilineInputStyle, { width: measureInputWidth }]}
                                               value={measureInputValue}
                                               onContentSizeChange={this._onContentSizeChangeMeasureInput}
                                               editable={false}
                                               multiline />
                                }
                            </View>
                        </View>
                    </ScrollComponent>
                </View>
            </KeyboardAvoidingView>
        );
    }

    _addListener() {
        this._keyboardShowListener = Keyboard.addListener(isIOS ? 'keyboardWillShow' : 'keyboardDidShow', this._onKeyboardShow);
        this._keyboardHideListener = Keyboard.addListener(isIOS ? 'keyboardWillHide' : 'keyboardDidHide', this._onKeyboardHide);
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

    _cloneDeepComponents(Component) {
        if (isArray(Component)) {
            return Component.map(subComponent => this._cloneDeepComponents(subComponent));
        } else if (Component && Component.props && Component.props.children) {
            const newComponent = { ...Component };
            newComponent.props = { ...Component.props };
            newComponent.props.children = this._cloneDeepComponents(Component.props.children);
            return newComponent;
        } else if (Component && Component.props && Component.props.multiline) {
            const newComponent = { ...Component };
            newComponent.props = { ...Component.props };
            return this._addMultilineHandle(newComponent);
        } else {
            return Component;
        }
    }

    _addMultilineHandle(Component) {
        const onChange = Component.props.onChange;
        const onSelectionChange = Component.props.onSelectionChange;
        const onContentSizeChange = Component.props.onContentSizeChange;

        Component.props.onChange = (event) => {
            this._onChange(event);
            onChange &&
                onChange(event);
        };

        Component.props.onSelectionChange = ({ ...event }) => {
            if (isIOS) {
                // 确保处理代码在 onChange 之后执行
                // release 版本必须使用 requestAnimationFrame
                requestAnimationFrame(() => this._onSelectionChange(event));
            } else {
                setTimeout(() => this._onSelectionChange(event));
            }
            onSelectionChange &&
                onSelectionChange(event);
        };

        // 使用防抖函数有两个目的
        // - 确保 scrollToKeyboardRequest 在 onSelectionChange 之后执行
        // - 短时间内不会重复执行 onContentSizeChange，因为当一次粘贴进许多行文本时，可能会连续触发多次 onContentSizeChange
        Component.props.onContentSizeChange = debounce(({ ...event }) => {
            this._onContentSizeChange(event);
            onContentSizeChange &&
                onContentSizeChange(event);
        }, 2);

        return Component;
    }

    _getInputInfo(target) {
        return this._inputInfoMap[target] = this._inputInfoMap[target] || {};
    }

    _measureCursorPosition(text, width, callback) {
        this._measureCallback = callback;
        this.setState({
            measureInputVisible: true,
            measureInputValue: text,
            measureInputWidth: width,
        });
    }

    // 这里必须使用防抖函数
    // 因为在真机上，当行数增多时，每调整一次 measureInputValue 的值，onContentSizeChange 都会触发多次。
    // 如果不使用防抖函数，那么在 onContentSizeChange 第一次触发时，measureInputVisible 就会被设置为 false，导致无法获取正确的值。
    // 但在模拟器上没有这个问题。
    _onContentSizeChangeMeasureInput = debounce(({ nativeEvent: event }) => {
        if (!this._measureCallback) return;
        this._measureCallback(event.contentSize.height);
        this._measureCallback = null;
        this.setState({ measureInputVisible: false });
    }, 3);

    _onRef = root => {
        const { useAnimatedScrollView } = this.props;
        if (!root) return;
        this._root = root;

        if (useAnimatedScrollView && this._root._component) {
            this._root = this._root._component;
        };

        setTimeout(() => {
            this._root._innerViewRef &&
            this._root._innerViewRef.measureInWindow((x, y, width, height) => {
                this._topOffset = y;
            });
        });
    };

    _onMomentumScrollEnd = ({ nativeEvent: event }) => {
        if (!this._keyboardShow) return;
        const contentBottomOffset = Math.max(
            0,
            this.state.contentBottomOffset +
            event.layoutMeasurement.height + // layoutMeasurement 可视区域的大小
            event.contentOffset.y -
            event.contentSize.height
        );
        this.setState({ contentBottomOffset });
    };

    _scrollToKeyboardRequest = () => {
        if (!this._keyboardShow) return;

        const curFocusTarget = TextInput.State.currentlyFocusedField();
        if (!curFocusTarget) return;

        const scrollResponder = this._root && this._root.getScrollResponder();
        if (!scrollResponder) return;

        UIManager.viewIsDescendantOf(
            curFocusTarget,
            scrollResponder.getInnerViewNode(),
            (isAncestor) => {
                if (!isAncestor) return;

                const { text, selectionEnd, width, height } = this._getInputInfo(curFocusTarget);
                const cursorAtLastLine = !text ||
                    selectionEnd === undefined ||
                    text.length === selectionEnd;

                if (cursorAtLastLine) {
                    return this._scrollToKeyboard(curFocusTarget, 0);
                }

                this._measureCursorPosition(
                    text.substr(0, selectionEnd),
                    width,
                    cursorRelativeTopOffset => {
                        this._scrollToKeyboard(
                            curFocusTarget,
                            Math.max(0, height - cursorRelativeTopOffset)
                        );
                    }
                );
            }
        );
    };

    _scrollToKeyboard = (target, offset) => {
        const toKeyboardOffset = this._topOffset + this.props.keyboardOffset - offset;
        this._root.scrollResponderScrollNativeHandleToKeyboard(target, toKeyboardOffset, true);
    };

    _onKeyboardShow = () => {
        this._keyboardShow = true;
        this._scrollToKeyboardRequest();
    };

    _onKeyboardHide = () => {
        this._keyboardShow = false;
        let atBottom = !!this.state.contentBottomOffset;
        this.setState({ contentBottomOffset: 0 }, () => {
            if (atBottom) {
                setTimeout(() => {
                    this._root.scrollToEnd({ animated: true });
                });
            }
        });
    };

    // 这个方法是为了防止 ScrollView 在滑动结束后触发 TextInput 的 focus 事件
    _onTouchStart = ({ ...event }) => {
        const target = event.target || event.currentTarget;
        if (target === TextInput.State.currentlyFocusedField()) return false;

        const targetInst = event._targetInst;
        let uiViewClassName;
        uiViewClassName = targetInst.type || // >= react-native 0.49
            targetInst.viewConfig.uiViewClassName; // <= react-native 0.48
        return uiViewClassName === 'RCTTextField' || uiViewClassName === 'RCTTextView';
    };

    // 在单行 TextInput 中
    // onFocus 在 keyboardWillShow 与 keyboardDidShow 之前触发
    // 在多行 TextInput 中
    // onFocus 在 keyboardDidShow 之前触发
    // onFocus 在 keyboardWillShow 之后触发
    _onFocus = ({ ...event }) => {
        // 当 onStartShouldSetResponderCapture 返回 true 时
        // 被激活的 TextInput 无法使用 Keyboard.dismiss() 来收起键盘
        // TextInput.State.currentlyFocusedField() 也无法获取当前焦点ID
        // 原因可能是系统并未判定 TextInput 获取焦点，这可能是一个 bug
        // 通常需要在 onStartShouldSetResponderCapture 返回 false 的情况下再点击一次 TextInput 才能恢复正常
        // 所以这里手动再设置一次焦点
        const target = event.target || event.currentTarget;
        TextInput.State.focusTextInput(target);

        const inputInfo = this._getInputInfo(target);
        const multiline = getProps(event._targetInst).multiline;

        if (multiline) {
            if (inputInfo.text === undefined) {
                const props = getProps(event._targetInst);
                inputInfo.text = props.value || props.defaultValue;
            }

            if (!isIOS) return;

            inputInfo.onFocusRequireScroll = true;
            setTimeout(() => {
                // 如果 onSelectionChange 没有触发，则在这里执行
                if (this._keyboardShow && inputInfo.onFocusRequireScroll) {
                    inputInfo.onFocusRequireScroll = false;
                    this._scrollToKeyboardRequest();
                }
            }, 250);
        } else {
            if (isIOS) this._scrollToKeyboardRequest();
        }
    };

    // onChange 在 onContentSizeChange 之前触发
    // onChange 在 onSelectionChange 之后触发
    _onChange = ({ ...event }) => {
        const target = event.target || event.currentTarget;
        const inputInfo = this._getInputInfo(target);
        inputInfo.text = event.nativeEvent.text;
    }

    // onSelectionChange 在 keyboardDidShow 之前触发
    // onSelectionChange 在 onContentSizeChange 之前触发
    // onSelectionChange 在 onFocus 之后触发
    _onSelectionChange = ({ ...event }) => {
        const target = event.target || event.currentTarget;
        const inputInfo = this._getInputInfo(target);
        inputInfo.selectionEnd = event.nativeEvent.selection.end;
        if (inputInfo.text === undefined) {
            inputInfo.text = getProps(event._targetInst).value;
        }

        if (!isIOS) return;

        if (inputInfo.onFocusRequireScroll) {
            inputInfo.onFocusRequireScroll = false;
            this._scrollToKeyboardRequest();
        }
    };

    _onContentSizeChange = ({ ...event }) => {
        const target = event.target || event.currentTarget;
        const inputInfo = this._getInputInfo(target);
        inputInfo.width = event.nativeEvent.contentSize.width;
        inputInfo.height = event.nativeEvent.contentSize.height;
        if (inputInfo.text === undefined) {
            inputInfo.text = getProps(event._targetInst).value;
        }
        this._scrollToKeyboardRequest(true);
    };
}

function getProps(targetNode) {
    return targetNode.memoizedProps || // >= react-native 0.49
        targetNode._currentElement.props; // <= react-native 0.48
}

function isArray(arr) {
    return Object.prototype.toString.call(arr) === '[object Array]';
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
