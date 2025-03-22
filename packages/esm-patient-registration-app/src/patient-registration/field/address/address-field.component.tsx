import React, { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { SkeletonText, InlineNotification } from '@carbon/react';
import { useConfig, useConnectivity } from '@openmrs/esm-framework';
import { Input } from '../../input/basic-input/input/input.component';
import { useOrderedAddressHierarchyLevels } from './address-hierarchy.resource';
import { usePatientRegistrationContext } from '../../patient-registration-context';
import { useResourcesContext } from '../../../resources-context';
import AddressHierarchyLevels from './address-hierarchy-levels.component';
import AddressSearchComponent from './address-search.component';
import styles from '../field.scss';

export const AddressComponent: React.FC = () => {
  const [selected, setSelected] = useState('');
  const { addressTemplate } = useResourcesContext();
  const addressLayout = useMemo(() => {
    if (!addressTemplate?.lines) {
      return [];
    }

    const allFields = addressTemplate?.lines?.flat();
    const fields = allFields?.filter(({ isToken }) => isToken === 'IS_ADDR_TOKEN');
    const allRequiredFields = Object.fromEntries(addressTemplate?.requiredElements?.map((curr) => [curr, curr]) || []);
    return fields.map(({ displayText, codeName }) => {
      return {
        id: codeName,
        name: codeName,
        label: displayText,
        required: Boolean(allRequiredFields[codeName]),
      };
    });
  }, [addressTemplate]);

  const { t } = useTranslation();
  const config = useConfig();
  const isOnline = useConnectivity();
  const {
    fieldConfigurations: {
      address: {
        useAddressHierarchy: { enabled: addressHierarchyEnabled, useQuickSearch, searchAddressByLevel },
      },
    },
  } = config;

  const { setFieldValue } = usePatientRegistrationContext();
  const { orderedFields, isLoadingFieldOrder, errorFetchingFieldOrder } = useOrderedAddressHierarchyLevels();

  useEffect(() => {
    if (addressTemplate?.elementDefaults) {
      Object.entries(addressTemplate.elementDefaults).forEach(([name, defaultValue]) => {
        setFieldValue(`address.${name}`, defaultValue);
      });
    }
  }, [addressTemplate, setFieldValue]);

  const orderedAddressFields = useMemo(() => {
    if (isLoadingFieldOrder || errorFetchingFieldOrder) {
      return [];
    }

    const orderMap = Object.fromEntries(orderedFields.map((field, indx) => [field, indx]));

    return [...addressLayout].sort(
      (existingField1, existingField2) => orderMap[existingField1.name] - orderMap[existingField2.name],
    );
  }, [isLoadingFieldOrder, errorFetchingFieldOrder, orderedFields, addressLayout]);

  if (addressTemplate && !Object.keys(addressTemplate)?.length) {
    return (
      <AddressComponentContainer>
        <SkeletonText role="progressbar" />
      </AddressComponentContainer>
    );
  }

  if (!addressHierarchyEnabled || !isOnline) {
    return (
      <AddressComponentContainer>
        {addressLayout.map((attributes, index) => (
          <Input
            key={`combo_input_${index}`}
            name={`address.${attributes.name}`}
            labelText={t(attributes.label)}
            id={attributes.name}
            value={selected}
            required={attributes.required}
          />
        ))}
      </AddressComponentContainer>
    );
  }

  if (isLoadingFieldOrder) {
    return (
      <AddressComponentContainer>
        <SkeletonText />
      </AddressComponentContainer>
    );
  }

  if (errorFetchingFieldOrder) {
    return (
      <AddressComponentContainer>
        <InlineNotification
          style={{ margin: '0', minWidth: '100%' }}
          kind="error"
          lowContrast={true}
          title={t('errorFetchingOrderedFields', 'Error occurred fetching ordered fields for address hierarchy')}
        />
      </AddressComponentContainer>
    );
  }

  return (
    <AddressComponentContainer>
      {useQuickSearch && <AddressSearchComponent addressLayout={orderedAddressFields} />}
      {searchAddressByLevel ? (
        <AddressHierarchyLevels orderedAddressFields={orderedAddressFields} />
      ) : (
        orderedAddressFields.map((attributes, index) => (
          <Input
            key={`combo_input_${index}`}
            name={`address.${attributes.name}`}
            labelText={t(attributes.label)}
            id={attributes.name}
            value={selected}
            required={attributes.required}
          />
        ))
      )}
    </AddressComponentContainer>
  );
};

const AddressComponentContainer = ({ children }) => {
  const { t } = useTranslation();
  return (
    <div>
      <h4 className={styles.productiveHeading02Light}>{t('addressHeader', 'Address')}</h4>
      <div
        style={{
          paddingBottom: '5%',
        }}>
        {children}
      </div>
    </div>
  );
};
