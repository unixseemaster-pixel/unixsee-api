export type TrafficLoadType =
  | 'idle'
  | 'normal'
  | 'busy'
  | 'high'
  | 'critical'
  | 'unknown';

export type TrafficStateType = {
  load: TrafficLoadType;
  activity: TrafficLoadType;
};
