import { Schema, model, Document } from 'mongoose';

// `courseSnapshot` berisi salinan info kursus pada saat pendaftaran terjadi
// (judul, jenjang, dst.), supaya data historisnya tetap sama walaupun info
// kursus aslinya berubah di kemudian hari.
export interface IEnrollment extends Document {
  createdAt: Date;
  status: 'active' | 'completed' | 'revoked';
  courseSnapshot: {
    courseId:  string;
    title:     string;
    slug:      string;
    level:     string;
    thumbnail?: string;
  };
}

// `enrollmentSchema` adalah "cetakan" yang memberi tahu MongoDB bentuk data
// seperti apa yang boleh disimpan, termasuk aturan seperti daftar status
// yang diperbolehkan dan nilai bawaan (default) untuk tiap field.
const enrollmentSchema = new Schema<IEnrollment>(
  {
    status: { type: String, enum: ['active', 'completed', 'revoked'], default: 'active' },
    courseSnapshot: {
      courseId:  String,
      title:     String,
      slug:      String,
      level:     String,
      thumbnail: String,
    },
  },
  { timestamps: true },
);
// dan menulis data pendaftaran ke database (contoh: EnrollmentModel.find()).
export const EnrollmentModel = model<IEnrollment>('Enrollment', enrollmentSchema);
