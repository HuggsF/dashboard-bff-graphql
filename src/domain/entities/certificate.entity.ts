import { InvalidAttributeError } from '@domain/errors/invalid-attribute.error';
import type { InvalidEntityError } from '@domain/errors/invalid-entity.error';
import { isHttpUrl } from '@domain/shared/http-url';
import { ViolationCollector, requireDate, requireId } from '@domain/shared/guards';
import { fail, ok } from '@domain/shared/result';
import type { Result } from '@domain/shared/result';

export type CertificateProps = {
  readonly id: string;
  readonly userId: string;
  readonly courseId: string;
  readonly issuedAt: Date;
  readonly pdfUrl: string;
  readonly certificateNumber: string;
};

/** Human-friendly, unique certificate number, e.g. `CERT-2025-000123`. */
const CERTIFICATE_NUMBER_PATTERN = /^[A-Z0-9][A-Z0-9-]{3,31}$/;

/** Proof that a user completed a course. */
export class Certificate {
  private constructor(
    readonly id: string,
    readonly userId: string,
    readonly courseId: string,
    readonly issuedAt: Date,
    readonly pdfUrl: string,
    readonly certificateNumber: string,
  ) {
    Object.freeze(this);
  }

  static create(props: CertificateProps): Result<Certificate, InvalidEntityError> {
    const violations = new ViolationCollector('Certificate');
    const id = violations.take(requireId('id', props.id));
    const userId = violations.take(requireId('userId', props.userId));
    const courseId = violations.take(requireId('courseId', props.courseId));
    const issuedAt = violations.take(requireDate('issuedAt', props.issuedAt));

    const pdfUrl = props.pdfUrl.trim();
    if (!isHttpUrl(pdfUrl)) {
      violations.add(
        new InvalidAttributeError('pdfUrl', props.pdfUrl, 'pdfUrl must be an absolute http(s) URL'),
      );
    }
    const certificateNumber = props.certificateNumber.trim().toUpperCase();
    if (!CERTIFICATE_NUMBER_PATTERN.test(certificateNumber)) {
      violations.add(
        new InvalidAttributeError(
          'certificateNumber',
          props.certificateNumber,
          'certificateNumber must have 4-32 uppercase letters, digits or hyphens',
        ),
      );
    }

    if (
      id === null ||
      userId === null ||
      courseId === null ||
      issuedAt === null ||
      violations.hasViolations
    ) {
      return fail(violations.toError());
    }
    return ok(new Certificate(id, userId, courseId, issuedAt, pdfUrl, certificateNumber));
  }

  equals(other: Certificate): boolean {
    return this.id === other.id;
  }
}
