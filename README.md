# react-native-input-scroll-view [![npm version](https://badge.fury.io/js/react-native-input-scroll-view.svg)](https://badge.fury.io/js/react-native-input-scroll-view)

Mainly to achieve the following functions：

- When the keyboard pops up, the `TextInput` will automatically adjust to the top of the keyboard.
- When the keyboard pops up, the content of the `ScrollView` will not be obscured by the keyboard.
- When multiline `TextInput` gets focus, the selected cursor will be automatically adjusted to the top of the keyboard.
- When the multiline `TextInput` create new line, the new line will automatically adjust to the top of the keyboard.
- Put your finger on top of `TextInput` and slide `ScrollView`, when you lift your finger, the `TextInput` will not get focus.


<img src="https://github.com/baijunjie/react-native-input-scroll-view/blob/master/images/demo.ios.gif" width="240">&nbsp;&nbsp;&nbsp;&nbsp;
<img src="https://github.com/baijunjie/react-native-input-scroll-view/blob/master/images/demo.android.gif" width="240">


## Installation

npm

```shell
$ npm install react-native-input-scroll-view --save
```

yarn

```shell
$ yarn add react-native-input-scroll-view
```



## Usage

```jsx
import InputScrollView from 'react-native-input-scroll-view';
...
state = {
    text: '',
};

render() {
    const { text } = this.state;
    return (
        <InputScrollView>
            <TextInput />
            <TextInput />
            <TextInput value={this.state.text}
                       onChangeText={text => this.setState({ text })}
                       multiline />
      	</InputScrollView>
    );
}
```

**Note that if the cursor is to be correctly adjusted to the top of the keyboard, you must bind `value` to `TextInput`.**

## Multiline TextInput in the Android

Because in Android, the height of the Multiline `TextInput` cannot be changed according to its content, so we need to add additional processing code

```jsx
import InputScrollView from 'react-native-input-scroll-view';
...

state = {
    text: '',
    textareaHeight: null,
};

render() {
    const { text, textareaHeight } = this.state;
    return (
        <InputScrollView>
            <TextInput />
            <TextInput />
            <TextInput style={{ height: textareaHeight }}
                       value={text}
                       onChangeText={text => this.setState({ text })}
                       onContentSizeChange={this._onContentSizeChange}
                       multiline />
      	</InputScrollView>
    );
}

_onContentSizeChange = ({nativeEvent:event}) => {
    this.setState({ textareaHeight: event.contentSize.height });
};
```

## Removing Listeners 

This plugin works by adding listeners to Keyboard. Given this, you have to remove listeners from the keyboard each time you push your screen to another or you will get an error [#15](https://github.com/baijunjie/react-native-input-scroll-view/issues/15). You don't have to do this when unmounting the screen.

You can remove listeners by adding a reference:
```
<InputScrollView ref={(ref) => { this.inputScrollView = ref }}>
this.inputScrollView._removeListener()
```

## Props

| Property | Type | Default | Description |
|-------------|----------|--------------|----------------------------------------------------------------|
| `keyboardOffset`   | `number` | `40` | When automatic adjustment, the cursor relative to the top of the keyboard offset. |
| `multilineInputStyle`     | `Style` | `{ fontSize: 17 }` | If your multiline `TextInput` has a specific style, to ensure that the cursor can be accurately adjusted to the top of the keyboard, this is set as a multiline `TextInput` style, The style attributes that mainly include `fontSize`、`fontFamily`、`lineHeight` etc. affect the position of the cursor. **Be careful not to include `width` and `height`**. |
| `useAnimatedScrollView`     | `bool` | `false` | Replace regular `ScrollView` component with `Animated.ScrollView` component.  |
| `...ScrolView.props`     | `props` |  | All props from ScrollView are inherited. Check them here: https://facebook.github.io/react-native/docs/scrollview.html  |


## ENV

```
"react": "^16.0.0-alpha.12"
"react-native": ">=0.46.0"
```



## Produt case

[![App_Store](https://github.com/baijunjie/react-native-input-scroll-view/blob/master/images/App_Store.png)](https://itunes.apple.com/us/app/id-butler-free/id1291749714?mt=8)



## License

MIT
