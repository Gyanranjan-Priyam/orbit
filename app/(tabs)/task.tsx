import { Platform } from 'react-native';

const IOSTask = require('./task.ios').default;
const AndroidTask = require('./task.android').default;

export default function TaskScreen() {
  if (Platform.OS === 'ios') {
    return <IOSTask />;
  } else {
    return <AndroidTask />;
  }
}
