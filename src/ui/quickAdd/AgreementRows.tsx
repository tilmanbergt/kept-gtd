/**
 * The lasso capture panel's Agreement row (docs/dev/history/technical-design-meetings-0.21.md
 * §5, R21): the words (ui/writing/WritingTextInput.tsx) and the valid-till
 * field, whose strip hovers over the row. Quick Add's box has its own form
 * (ui/quickAdd/form/). Mounted with the other kinds' rows, hidden while
 * another kind shows.
 */
import React from 'react';
import {usePerfRender} from '../../utils/perf';
import {View} from 'react-native';
import WritingTextInput from '../writing/WritingTextInput';
import ValidTillInput, {ValidTillStrip} from '../ValidTillInput';
import MarkWrap from '../status/StatusMark';
import {rowStyles} from './styles';
import {AgreementDraftState} from './useAgreementDraft';
import {QuickAddCore} from './useQuickAddCore';

interface Colors {
  textColor: string;
  borderColor: string;
  placeholderColor: string;
}

interface Props extends Colors {
  core: QuickAddCore;
  agreement: AgreementDraftState;
  today: string;
}

export function AgreementInputRow({core, agreement, today, textColor, borderColor, placeholderColor}: Props) {
  usePerfRender('QuickAddRows:agreement');
  const {fields} = agreement;
  return (
    <View style={[rowStyles.row2, core.displayType !== 'agreement' && rowStyles.hidden]}>
      <View style={rowStyles.row2Wrap}>
        <View style={rowStyles.inputFlex}>
          <MarkWrap mark={core.fieldMark('text')} textColor={textColor} flex>
            <WritingTextInput
              field={agreement.textField}
              value={fields.text}
              onSubmitEditing={agreement.editing ? agreement.submitEdit : agreement.submitCreate}
              placeholder="New agreement"
              placeholderColor={placeholderColor}
              textColor={textColor}
              borderColor={borderColor}
              editable={!core.pending}
              stripPlacement="above-left"
            />
          </MarkWrap>
        </View>
        <ValidTillInput
          valid={fields.valid}
          onChange={agreement.setValid}
          today={today}
          open={agreement.validOpen}
          onOpenChange={agreement.setValidOpen}
          typing={agreement.validTyping}
          onTypingChange={agreement.setValidTyping}
          textColor={textColor}
          borderColor={borderColor}
          placeholderColor={placeholderColor}
        />
      </View>
      <ValidTillStrip
        visible={agreement.validOpen && core.displayType === 'agreement'}
        today={today}
        onPick={valid => {
          agreement.setValid(valid);
          agreement.setValidOpen(false);
        }}
        onType={() => {
          agreement.setValidOpen(false);
          agreement.setValidTyping(true);
        }}
        onClose={() => agreement.setValidOpen(false)}
        textColor={textColor}
        borderColor={borderColor}
      />
    </View>
  );
}
