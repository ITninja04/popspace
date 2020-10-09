import { makeStyles } from '@material-ui/core';
import { FastField, Form, Formik } from 'formik';
import * as React from 'react';
import { FormikSubmitButton } from '../../../../withComponents/fieldBindings/FormikSubmitButton';
import { StickyNoteWidgetData } from '../../../../types/room';

type RequiredStickyNoteData = Omit<StickyNoteWidgetData, 'author'>;

export interface IEditStickyNoteWidgetFormProps {
  onSave: (data: RequiredStickyNoteData) => any;
  initialValues: RequiredStickyNoteData;
}

const EMPTY_VALUES: RequiredStickyNoteData = {
  text: '',
};

const useStyles = makeStyles((theme) => ({
  textarea: {
    border: 'none',
    width: '100%',
    minHeight: 120,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.pxToRem(14),
    resize: 'none',
    '&:focus': {
      // FIXME: this could use better accessibility
      outline: 'none',
    },
  },
}));

export const EditStickyNoteWidgetForm: React.FC<IEditStickyNoteWidgetFormProps> = ({
  initialValues = EMPTY_VALUES,
  onSave,
}) => {
  const classes = useStyles();

  return (
    <Formik initialValues={initialValues} onSubmit={onSave}>
      <Form>
        <FastField as="textarea" required name="text" placeholder="Note text" className={classes.textarea} autoFocus />
        <FormikSubmitButton>Add note</FormikSubmitButton>
      </Form>
    </Formik>
  );
};
