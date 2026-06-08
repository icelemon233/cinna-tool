import React from 'react';
import styled from '@emotion/styled';
import type { FilterType } from '../types/todo';

const FilterContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 0;
  margin-bottom: 16px;
  border-bottom: 1px solid #e2e8f0;
`;

const FilterButtons = styled.div`
  display: flex;
  gap: 6px;
`;

const FilterButton = styled.button<{ active: boolean }>`
  padding: 8px 16px;
  border: 1px solid ${({ active }) => (active ? '#667eea' : '#e2e8f0')};
  border-radius: 6px;
  background: ${({ active }) => (active ? '#667eea' : '#fff')};
  color: ${({ active }) => (active ? '#fff' : '#4a5568')};
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: #667eea;
    background: ${({ active }) => (active ? '#667eea' : '#ebf4ff')};
  }
`;

const Info = styled.span`
  font-size: 13px;
  color: #718096;
`;

const ClearButton = styled.button`
  padding: 8px 14px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  background: #fff;
  color: #e53e3e;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: #fff5f5;
    border-color: #feb2b2;
  }
`;

const RightSection = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

interface TodoFilterProps {
  filter: FilterType;
  activeCount: number;
  hasCompleted: boolean;
  onFilterChange: (filter: FilterType) => void;
  onClearCompleted: () => void;
}

const TodoFilter: React.FC<TodoFilterProps> = ({
  filter,
  activeCount,
  hasCompleted,
  onFilterChange,
  onClearCompleted,
}) => {
  return (
    <FilterContainer>
      <FilterButtons>
        <FilterButton active={filter === 'all'} onClick={() => onFilterChange('all')}>
          All
        </FilterButton>
        <FilterButton active={filter === 'active'} onClick={() => onFilterChange('active')}>
          Active
        </FilterButton>
        <FilterButton active={filter === 'completed'} onClick={() => onFilterChange('completed')}>
          Completed
        </FilterButton>
      </FilterButtons>
      <RightSection>
        <Info>
          {activeCount} item{activeCount !== 1 ? 's' : ''} left
        </Info>
        {hasCompleted && (
          <ClearButton onClick={onClearCompleted}>Clear Completed</ClearButton>
        )}
      </RightSection>
    </FilterContainer>
  );
};

export default TodoFilter;
