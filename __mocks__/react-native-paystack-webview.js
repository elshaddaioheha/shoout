const React = require('react');
const { View } = require('react-native');

const Paystack = React.forwardRef((props, ref) => {
    React.useImperativeHandle(ref, () => ({
        startTransaction: () => props.onSuccess({ reference: 'test' })
    }));
    return <View testID="paystack-mock" />;
});

module.exports = { Paystack };
