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
} from 'react-native';
import TextInputState from 'react-native/Libraries/Components/TextInput/TextInputState';

const isIOS = Platform.OS === 'ios';

export default class extends Component {
    static propTypes = {
        keyboardOffset: PropTypes.number,
        multilineInputStyle: PropTypes.oneOfType([
            PropTypes.object,
            PropTypes.array,
            PropTypes.number,
        ]),
    };

    static defaultProps = {
        keyboardOffset: 40,
        multilineInputStyle: { fontSize: 17 },
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
        this._moved = false;
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
            ...otherProps,
        } = this.props;

        const {
            measureInputVisible,
            measureInputValue,
            measureInputWidth,
            contentBottomOffset,
        } = this.state;

        const newChildren = this._cloneDeepComponents(children);

        return (
            <KeyboardAvoidingView behavior="padding">
                <View style={styles.wrap}>
                    <ScrollView ref={this._onRef}
                                onMomentumScrollEnd={this._onMomentumScrollEnd}
                                onFocusCapture={this._onFocus} {...otherProps}>
                        <View style={{ marginBottom: contentBottomOffset }}
                              onStartShouldSetResponderCapture={this._onTouchStart}
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

    _cloneDeepComponents(Components) {
        if (isArray(Components)) {
            return Components.map(Comp => {
                const newComp = { ...Comp };
                newComp.props = { ...Comp.props };

                if (newComp.props.multiline) {
                    const onChange = newComp.props.onChange;
                    const onSelectionChange = newComp.props.onSelectionChange;
                    const onContentSizeChange = newComp.props.onContentSizeChange;

                    newComp.props.onChange = (event) => {
                        this._onChange(event);
                        onChange &&
                        onChange(event);
                    };

                    newComp.props.onSelectionChange = (event) => {
                        this._onSelectionChange(event);
                        onSelectionChange &&
                        onSelectionChange(event);
                    };

                    newComp.props.onContentSizeChange = (event) => {
                        this._onContentSizeChange(event);
                        onContentSizeChange &&
                        onContentSizeChange(event);
                    };
                }

                if (newComp.props.children) {
                    newComp.props.children = this._cloneDeepComponents(Comp.props.children);
                }

                return newComp;
            });
        } else if (Components.props.children) {
            const newComp = { ...Components };
            newComp.props = { ...Components.props };
            newComp.props.children = this._cloneDeepComponents(Components.props.children);
            return newComp;
        } else {
            return Components;
        }

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
    _onContentSizeChangeMeasureInput = debounce(event => {
        if (!this._measureCallback) return;
        this._measureCallback(event.contentSize.height);
        this._measureCallback = null;
        this.setState({ measureInputVisible: false });
    }, 3);

    _onRef = root => {
        if (!root) return;
        this._root = root;

        setTimeout(() => {
            root._innerViewRef.measureInWindow((x, y, width, height) => {
                this._topOffset = y;
            });
        });
    };

    _onMomentumScrollEnd = ({nativeEvent:event}) => {
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

        const curFocusTarget = TextInputState.currentlyFocusedField();
        if (!curFocusTarget) return;

        const { text, selectionEnd, width, height } = this._inputInfoMap[curFocusTarget];
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
    };

    _scrollToKeyboard = (target, offset) => {
        const toKeyboardOffset = this._topOffset + this.props.keyboardOffset - offset;
        this._root.scrollResponderScrollNativeHandleToKeyboard(target, toKeyboardOffset, true);
    };

    _onKeyboardShow = (event) => {
        this._keyboardShow = true;
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
    _onTouchStart = ({...event}) => {
        if (event.target === TextInputState.currentlyFocusedField()) return false;

        let uiViewClassName;
        if (isIOS) {
            uiViewClassName = event._targetInst.type || // >= react-native 0.49
                              event._targetInst.viewConfig.uiViewClassName; // <= react-native 0.48
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
        // 针对 android 设备输入框无法获取焦点的 hack
        // 在 ios 中无效
        if (this._moved) {
            this._moved = false;
        } else {
            TextInputState.focusTextInput(event.target);
        }
    };

    // onFocus 在 keyboardDidShow 之前触发
    // onFocus 在 keyboardWillShow 之后触发
    _onFocus = ({...event}) => {
        // 当 onStartShouldSetResponderCapture 返回 true 时
        // 被激活的 TextInput 无法使用 Keyboard.dismiss() 来收起键盘
        // TextInputState.currentlyFocusedField() 也无法获取当前焦点ID
        // 原因可能是系统并未判定 TextInput 获取焦点，这可能是一个 bug
        // 通常需要在 onStartShouldSetResponderCapture 返回 false 的情况下再点击一次 TextInput 才能恢复正常
        // 所以这里手动再设置一次焦点
        TextInputState.focusTextInput(event.target);

        const inputInfo = this._getInputInfo(event.target);
        const multiline = getProps(event._targetInst).multiline;

        if (multiline) {
            inputInfo.onFocusRequireScroll = true;
            setTimeout(() => {

                // 如果 onSelectionChange 没有触发，则在这里执行
                if (inputInfo.onFocusRequireScroll) {
                    inputInfo.onFocusRequireScroll = false;

                    if (inputInfo.text === undefined) {
                        inputInfo.text = getProps(event._targetInst).value;
                    }

                    this._scrollToKeyboardRequest();
                }
            }, 250);
        } else {
            inputInfo.cursorAtLastLine = true;
            this._scrollToKeyboardRequest();
        }
    };

    // onChange 在 onContentSizeChange 之前触发
    // onChange 在 onSelectionChange 之后触发
    _onChange = ({...event}) => {
        const inputInfo = this._getInputInfo(event.target);
        inputInfo.text = event.nativeEvent.text;
    }

    // onSelectionChange 在 keyboardDidShow 之前触发
    // onSelectionChange 在 onContentSizeChange 之前触发
    // onSelectionChange 在 onFocus 之后触发
    _onSelectionChange = ({...event}) => {
        // 确保处理代码在 onChange 之后执行
        // release 版本必须使用 requestAnimationFrame
        requestAnimationFrame(() => {
            const inputInfo = this._getInputInfo(event.target);
            inputInfo.selectionEnd = event.nativeEvent.selection.end;

            if (inputInfo.text === undefined) {
                inputInfo.text = getProps(event._targetInst).value;
            }

            if (inputInfo.onFocusRequireScroll) {
                inputInfo.onFocusRequireScroll = false;
                this._scrollToKeyboardRequest();
            }
        });
    };

    // 使用防抖函数有两个目的
    // - 确保 scrollToKeyboardRequest 在 onSelectionChange 之后执行
    // - 短时间内不会重复执行 onContentSizeChange，因为当一次粘贴进许多行文本时，可能会连续触发多次 onContentSizeChange
    _onContentSizeChange = debounce(event => {
        const inputInfo = this._getInputInfo(event.target);
        inputInfo.width = event.contentSize.width;
        inputInfo.height = event.contentSize.height;
        this._scrollToKeyboardRequest(true);
    }, 2);
}

function getProps(targetNode) {
    return targetNode.memoizedProps || // >= react-native 0.49
           targetNode._currentElement.props; // <= react-native 0.48
}

function debounce(func, wait) {
    wait = wait || 1;
    let id, count;
    let rAF = function(event) {
        if (count) {
            count--;
            id = requestAnimationFrame(() => rAF.call(this, event));
        } else {
            func.call(this, event);
        }
    };
    return function({nativeEvent:event}) {
        cancelAnimationFrame(id);
        count = wait;
        rAF.call(this, event);
    };
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
