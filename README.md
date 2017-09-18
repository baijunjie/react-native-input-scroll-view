# react-native-input-scroll-view
Mainly to achieve the following functions：

- When the keyboard pops up, the `TextInput` will automatically adjust to the top of the keyboard.
- When the keyboard pops up, the content of the `ScrollView` will not be obscured by the keyboard.
- When multiline `TextInput` gets focus, the selected cursor will be automatically adjusted to the top of the keyboard.
- When the multiline `TextInput` create new line, the new line will automatically adjust to the top of the keyboard.
- Put your finger on top of `TextInput` and slide `ScrollView`, when you lift your finger, the `TextInput` will not get focus.

All of these features are for IOS only.

![demo](https://github.com/baijunjie/react-native-input-scroll-view/blob/master/demo.gif)

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

Does not contain multiline `TextInput`

```jsx
import InputScrollView from 'react-native-input-scroll-view';
...
render() {
    return (
        <InputScrollView>
            <TextInput />
            <TextInput />
            <TextInput />
      	</InputScrollView>
    );
}
```

Contains multiline `TextInput`

```jsx
import InputScrollView from 'react-native-input-scroll-view';
...
constructor(props) {
    super(props);
    this.state = {
        multiLineInputHandles: null,
    };
}

render() {
    return (
        <InputScrollView getMultiLineInputHandles={handles => this.setState({multiLineInputHandles: handles})}>
            <TextInput />
            <TextInput />
            <TextInput />
            <TextInput value={this.state.remarks}
              onChangeText={text => this.setState({remarks: text})}
              multiline
              {...this.state.multiLineInputHandles} />
      	</InputScrollView>
    );
}
```

**Note that if the cursor is to be correctly adjusted to the top of the keyboard, you must bind `value` to `TextInput`.**



## Props

#### props.keyboardOffset

`default: 40`

When automatic adjustment, the cursor relative to the top of the keyboard offset.

#### props.topOffset

`default: 0`

If your `ScrollView` is at a distance from the top of the window, say a `navigatorHeight` distance, then set it to `navigatorHeight`.

#### props.bottomOffset

`default: 0`

If your `ScrollView` is at a distance from the bottom of the window, say a `tabBarHeight` distance, then set it to `tabBarHeight`.

#### props.getMultiLineInputHandles

`default: null`

If I set it to a function, this function returns an object, this object contains two more event callbacks, `onSelectionChange` and `onContentSizeChange`,  to deal with the corresponding event of multiline `TextInput`.



## ENV

```
"react": "^16.0.0-alpha.12"
"react-native": "^0.48.0-rc.1"
```



## License

MIT