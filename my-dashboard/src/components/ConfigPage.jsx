import React from 'react';
import UserManagement from './UserManagement';
import CategoryManager from './CategoryManager';
import DepartmentManager from './DepartmentManager';
import NotificationSettings from './NotificationSettings';
import RoleTasksManager from './RoleTasksManager';

const ConfigPage = () => {
  return (
    <div className="px-6 space-y-6 pb-10">
      <UserManagement />
      <RoleTasksManager />
      <CategoryManager />
      <DepartmentManager />
      <NotificationSettings />
    </div>
  );
};

export default ConfigPage;
