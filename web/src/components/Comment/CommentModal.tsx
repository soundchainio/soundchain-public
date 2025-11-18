import React, { useState } from 'react';
import classNames from 'classnames';
import GraphemeSplitter from 'grapheme-splitter';
import { useModalDispatch, useModalState } from 'contexts/ModalContext';
import { useCommentQuery } from 'lib/graphql';
import { CommentForm } from './CommentForm'; // Ensure the path is correct
import { ModalsPortal } from '../ModalsPortal'; // Ensure the path is correct

const splitter = new GraphemeSplitter();

// Helper to get character count
export const getBodyCharacterCount = (body?: string) => {
  return splitter.splitGraphemes(body || '').length;
};

// Accordion-style CommentModal
export const CommentAccordion = () => {
  const [expanded, setExpanded] = useState(false); // Accordion toggle state
  const { editCommentId = '' } = useModalState();
  const { dispatchSetEditCommentId } = useModalDispatch();

  const { data: editingComment } = useCommentQuery({
    variables: { id: editCommentId },
    skip: !editCommentId,
  });

  const initialValues = { body: editingComment?.comment.body || '' };

  const toggleAccordion = () => {
    setExpanded((prev) => !prev); // Toggle accordion open/close
    if (!expanded) {
      dispatchSetEditCommentId(editCommentId); // Set comment ID for editing if needed
    } else {
      dispatchSetEditCommentId(undefined); // Clear when closed
    }
  };

  const clearState = () => {
    setExpanded(false); // Close accordion
    dispatchSetEditCommentId(undefined);
  };

  const cancel = (setFieldValue: (field: string, value: string) => void) => {
    setFieldValue('body', '');
    clearState();
  };

  return (
    <div className="relative">
      {/* Accordion Trigger */}
      <button
        onClick={toggleAccordion}
        className="flex items-center justify-between w-full py-2 px-4 bg-gray-200 rounded hover:bg-gray-300"
      >
        <span>Comments</span>
        <span className={expanded ? 'rotate-180' : ''}>▼</span>
      </button>

      {/* Accordion Content */}
      <div
        className={classNames('transition-all duration-300 overflow-hidden', {
          'max-h-0': !expanded,
          'max-h-[500px] overflow-auto': expanded, // Adjust max height if necessary
        })}
      >
        {expanded && (
          <div className="p-4 border-t border-gray-300 bg-white">
            <CommentForm initialValues={initialValues} afterSubmit={clearState} onCancel={cancel} />

            {/* Optional: Character Count */}
            <div className="mt-2 text-sm text-gray-500">
              Characters: {getBodyCharacterCount(initialValues.body)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CommentAccordion;
