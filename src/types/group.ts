export interface Group {
  id: string;
  name: string;
  icon?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateGroupRequest {
  name: string;
  icon?: string;
}

export interface UpdateGroupRequest {
  name: string;
  icon?: string;
}
