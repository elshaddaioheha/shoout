const React = require('react');
const { View } = require('react-native');

const PayWithFlutterwave = (props) => {
    // We can simulate an onRedirect with status successful if we wanted.
    return <View testID="flutterwave-mock" />;
};

module.exports = { PayWithFlutterwave };
