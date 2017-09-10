# react-native-input-scroll-view
Mainly to solve the following problems：

- When the keyboard pops up, the `TextInput` will automatically adjust to the top of the keyboard.
- When the multiline `TextInput` create new line, the new line will automatically adjust to the top of the keyboard.
- When the finger is placed above the `TextInput` and scroll the view, finger lift, the `TextInput` will not get focus.

All of the above problems are in IOS.



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

Very easy

```jsx
import InputScrollView from 'react-native-input-scroll-view';
...
render() {
    return (
        <InputScrollView>
            <TextInput/>
            <TextInput/>
            <TextInput/>
      	</InputScrollView>
    );
}
```



## Props

#### props.lock

Make the scrollview no longer follow the keyboard adjustment, default is `false`. Sometimes you might need it.

To monitor multiline `TextInput`, the `ScrollView`'s `onContentSizeChange` event is used. But that brings with it a side effect, when the `ContentSize` of `ScrollView` changes is not due to multiline text input, and at the same time the keyboard is hidden, may result in a `ScrollView` error correction, set it to `true`, might solve the problem.

#### props.topOffset

If you find out that the keyboard pops up, the top of the ScrollView shows that the location is not normal, you just need to set it to `navigatorHeight`.

#### props.bottomOffset

If you find that the keyboard pops up, the bottom of the ScrollView is not normal, you just need to set it to `tabBarHeight`.



## ENV

```
"react": "^16.0.0-alpha.12"
"react-native": "^0.48.0-rc.1"
```



## License

MIT