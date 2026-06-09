import React from 'react';
import styled from '@emotion/styled';
import TodoSidebar from './TodoSidebar';
import TodoContent from './TodoContent';

const PageContainer = styled.div`
  display: flex;
  flex-direction: row;
  height: 100%;
  overflow: hidden;
`;

const SidebarPanel = styled.div`
  width: 260px;
  min-width: 200px;
  max-width: 280px;
  flex-shrink: 0;
  border-right: 1px solid var(--border-color);
  overflow: hidden;
`;

const ContentPanel = styled.div`
  flex: 1;
  min-width: 0;
  overflow: hidden;
`;

const TodoPage: React.FC = () => {
  return (
    <PageContainer>
      <SidebarPanel>
        <TodoSidebar />
      </SidebarPanel>
      <ContentPanel>
        <TodoContent />
      </ContentPanel>
    </PageContainer>
  );
};

export default TodoPage;
