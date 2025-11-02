import {Schema} from 'mongoose';

const paymentSchema = new Schema({
    amount: {type: Number, required: true},
    currency: {type: String, required: true},
    method: {type: String, required: true},
    status: {type: String, required: true},
    orderId: {type: Schema.Types.ObjectId, ref: 'Order', required: true},
    transactionId: {type: String, required: true, unique: true},
}, {timestamps: true});

export const Payment = mongoose.model('Payment', paymentSchema);