import { AlertSeverity } from '../enums/alert-severity.enum.js';
import { AlertStatus } from '../enums/alert-status.enum.js';

export interface Alert {
  id: string;
  websiteId: string;

  title: string;
  message: string;

  severity: AlertSeverity;
  status: AlertStatus;

  createdAt: Date;
}
