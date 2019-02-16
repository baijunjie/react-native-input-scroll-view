import * as React from 'react';
import { ScrollViewProperties, TextStyle, ScrollView } from 'react-native';

export interface InputScrollViewProps extends ScrollViewProperties {
  readonly topOffset?: number;
  readonly keyboardOffset?: number;
  readonly multilineInputStyle?: TextStyle;
  readonly useAnimatedScrollView?: boolean;
  readonly keyboardAvoidingViewProps?: object;
}

declare class InputScrollView extends React.Component<InputScrollViewProps> {
  public scrollTo: ScrollView['scrollTo'];
  public scrollToEnd: ScrollView['scrollToEnd'];
}

export default InputScrollView;
