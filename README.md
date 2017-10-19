# react-native-input-scroll-view
Mainly to achieve the following functions：

- When the keyboard pops up, the `TextInput` will automatically adjust to the top of the keyboard.
- When the keyboard pops up, the content of the `ScrollView` will not be obscured by the keyboard.
- When multiline `TextInput` gets focus, the selected cursor will be automatically adjusted to the top of the keyboard.
- When the multiline `TextInput` create new line, the new line will automatically adjust to the top of the keyboard.
- Put your finger on top of `TextInput` and slide `ScrollView`, when you lift your finger, the `TextInput` will not get focus.



![demo](https://github.com/baijunjie/react-native-input-scroll-view/blob/master/images/demo.gif)

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
        multilineInputHandles: null,
    };
}

render() {
    return (
        <InputScrollView getMultilineInputHandles={handles => this.setState({multilineInputHandles: handles})}>
            <TextInput />
            <TextInput />
            <TextInput />
            <TextInput value={this.state.remarks}
                       onChangeText={text => this.setState({remarks: text})}
                       multiline
                       {...this.state.multilineInputHandles} />
      	</InputScrollView>
    );
}
```

**Note, It's recommended to use `onChangeText` to bind `value`. Because `multilineInputHandles` contains `onChange`, If you must use `onChange`, you can use the following methods: **

```jsx
render() {
    const { changeHandle, ...otherHandles } = this.state.multilineInputHandles;
    return (
        <InputScrollView getMultilineInputHandles={handles => this.setState({multilineInputHandles: handles})}>
            <TextInput />
            <TextInput />
            <TextInput />
            <TextInput value={this.state.remarks}
                       onChange={({...event}) => {
                           changeHandle({event});
                           this.setState({remarks: event.nativeEvent.text});
          	           }}
                       multiline
                       {...otherHandles} />
      	</InputScrollView>
    );
}
```



## Props

#### props.keyboardOffset

`default: 40`

When automatic adjustment, the cursor relative to the top of the keyboard offset.

#### props.getMultilineInputHandles

`default: null`

If I set it to a function, this function returns an object, this object contains two more event callbacks,  `onChange` and `onSelectionChange` and `onContentSizeChange`,  to deal with the corresponding event of multiline `TextInput`.

#### props.multilineInputStyle

`default: { fontSize: 17 }`

If your multiline `TextInput` has a specific style, to ensure that the cursor can be accurately adjusted to the top of the keyboard, this is set as a multiline `TextInput` style, The style attributes that mainly include `fontSize`、`fontFamily`、`lineHeight` etc. affect the position of the cursor. **Be careful not to include `width` and `height`**.



## ENV

```
"react": "^16.0.0-alpha.12"
"react-native": ">=0.46.0"
```



## Produt case

[![App_Store](https://github.com/baijunjie/react-native-input-scroll-view/blob/master/images/App_Store.png)](https://itunes.apple.com/us/app/id-butler-free/id1291749714?mt=8)



## License

MIT