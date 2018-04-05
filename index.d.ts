import * as React from 'react';
import { ScrollViewProperties, TextStyle } from 'react-native';

export interface InputScrollViewProps extends ScrollViewProperties {
  readonly keyboardOffset?: number;
  readonly multilineInputStyle?: TextStyle;
  readonly useAnimatedScrollView?: boolean;
}

declare class InputScrollView extends React.Component<InputScrollViewProps> { }

export default InputScrollView;
