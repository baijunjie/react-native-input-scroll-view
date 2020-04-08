/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow
 */

import React, { Component } from 'react';
import {StyleSheet, TextInput, View, Text} from 'react-native';
import InputScrollView from './react-native-input-scroll-view';

const MyComponent = props => (
  <View>
    <TextInput {...props} />
  </View>
)

export default class App extends Component {
  state = {
    text: '',
    textarea: '',
  };

  render() {
    const { text, textarea } = this.state;
    return (
      <View style={styles.container}>
        <InputScrollView>
          <View style={styles.placeholder} />
          <TextInput style={styles.input}
                     value={text}
                     onChangeText={text => this.setState({ text })}
          />
          <MyComponent style={styles.textarea}
                       value={textarea}
                       onChangeText={text => this.setState({ textarea: text })}
                       multiline
          />
        </InputScrollView>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#EEE',
  },
  placeholder: {
    height: 400,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    margin: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderColor: 'gray',
    borderWidth: 1,
    backgroundColor: '#FFF',
  },
  textarea: {
    margin: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderColor: 'gray',
    borderWidth: 1,
    backgroundColor: '#FFF',
  },
});
