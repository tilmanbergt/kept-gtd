/**
 * Row 3 of the agreement form (docs/dev/history/technical-design-quickadd-redesign.md
 * §3.3): the valid-till field. Its presets hover over row 2 (StripHost).
 */
import React from 'react';
import {View} from 'react-native';
import ValidTillInput from '../../ValidTillInput';
import {rowStyles} from '../styles';
import {AgreementDraftState} from '../useAgreementDraft';

interface Props {
  agreement: AgreementDraftState;
  today: string;
  hidden: boolean;
  textColor: string;
  borderColor: string;
  placeholderColor: string;
}

export default function Row3Agreement({agreement, today, hidden, textColor, borderColor, placeholderColor}: Props): React.JSX.Element {
  return (
    <View style={[rowStyles.row3, rowStyles.row3Start, hidden && rowStyles.hidden]}>
      <ValidTillInput
        valid={agreement.fields.valid}
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
  );
}
