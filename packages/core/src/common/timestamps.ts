export interface Timestamped {
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface SoftDeletable extends Timestamped {
  readonly deletedAt: Date | null;
}
