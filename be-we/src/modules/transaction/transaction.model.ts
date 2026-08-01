import { Schema, model, Document } from 'mongoose';

export interface ITransaction extends Document {
  createdAt: Date;
  payment: {
    status: 'pending' | 'paid' | 'expired' | 'cancelled';
    paidAt?: Date;
  };
  financials: {
    grandTotal: number;
    discountAmount: number;
  };
  promotionSnapshot?: {
    code: string;
    type: string;
  };
  paymentMethodSnapshot: {
    providerName: string;
  };
}

// Bagian data promosi/kupon diskon ditulis sebagai skema terpisah seperti
// ini (bukan objek biasa) karena salah satu isinya bernama `type` — kalau
// ditulis sebagai objek polos, Mongoose akan salah mengira `type` itu
// sebagai penanda tipe data untuk `promotionSnapshot` itu sendiri, bukan
// sebagai nama field biasa. Menuliskannya sebagai Schema terpisah seperti
// ini menghindari kebingungan tersebut.
const promotionSnapshotSchema = new Schema(
  {
    code: String,
    type: String,
  },
  { _id: false },
);

// `transactionSchema` adalah cetakan bentuk data transaksi yang disimpan
// ke MongoDB, lengkap dengan nilai bawaan (default) untuk tiap field.
const transactionSchema = new Schema<ITransaction>(
  {
    payment: {
      status: { type: String, enum: ['pending', 'paid', 'expired', 'cancelled'], default: 'pending' },
      paidAt: { type: Date },
    },
    financials: {
      grandTotal:     { type: Number, default: 0 },
      discountAmount: { type: Number, default: 0 },
    },
    promotionSnapshot: promotionSnapshotSchema,
    paymentMethodSnapshot: {
      providerName: String,
    },
  },
  { timestamps: true },
);
export const TransactionModel = model<ITransaction>('Transaction', transactionSchema);
