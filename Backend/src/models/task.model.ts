import { Schema, model, Document, Types } from "mongoose";

export type TaskStatus = "pending" | "completed";

export interface ITask extends Document {
  title: string;
  description?: string;
  status: TaskStatus;
  dueDate?: Date;
  owner: Types.ObjectId;
  createdAt: Date;
}

const taskSchema = new Schema<ITask>(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      maxlength: [100, "Title must be at most 100 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description must be at most 500 characters"],
      default: "",
    },
    status: {
      type: String,
      enum: {
        values: ["pending", "completed"],
        message: "Status must be either pending or completed",
      },
      default: "pending",
    },
    dueDate: {
      type: Date,
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Compound index: serves "tasks for this user" and "tasks for this user by status"
taskSchema.index({ owner: 1, status: 1 });
// Supports sorting a user's tasks by newest first
taskSchema.index({ owner: 1, createdAt: -1 });

export const Task = model<ITask>("Task", taskSchema);