"use client";
import { Card } from "@/components/ui/card";
import { toast } from "@/components/ui/sonner";
import type {
  UniRefund_CRMService_AddressTypes_UpdateAddressTypeDto,
  UniRefund_CRMService_EmailCommonDatas_UpdateEmailCommonDataDto,
  UniRefund_CRMService_Merchants_MerchantDto,
  UniRefund_CRMService_Organizations_UpdateOrganizationDto,
  UniRefund_CRMService_TelephoneTypes_UpdateTelephoneTypeDto,
  Volo_Abp_Application_Dtos_PagedResultDto_18,
} from "@ayasofyazilim/saas/CRMService";
import { createZodObject } from "@repo/ayasofyazilim-ui/lib/create-zod-object";
import jsonToCSV from "@repo/ayasofyazilim-ui/lib/json-to-csv";
import { PageHeader } from "@repo/ayasofyazilim-ui/molecules/page-header";
import type { TableAction } from "@repo/ayasofyazilim-ui/molecules/tables";
import DataTable from "@repo/ayasofyazilim-ui/molecules/tables";
import AutoForm, {
  AutoFormSubmit,
} from "@repo/ayasofyazilim-ui/organisms/auto-form";
import {
  SectionLayout,
  SectionLayoutContent,
} from "@repo/ayasofyazilim-ui/templates/section-layout-v2";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getResourceDataClient } from "src/language-data/CRMService";
import { useLocale } from "src/providers/locale";
import type { TableData } from "src/utils";
import { getBaseLink } from "src/utils";
import { isPhoneValid, splitPhone } from "src/utils-phone";
import { dataConfigOfCrm } from "../../../data";
import {
  deleteIndividualByMerchantId,
  deleteSubMerchantByMerchantId,
  getIndividualByMerchantId,
  getSubCompanyByMerchantId,
} from "../../../actions/merchant";
import { updateCRMDetailServer, updateMerchantCRMDetailServer } from "./action";
import type { Individual } from "./data";
import {
  address,
  email,
  individualSchema,
  organization,
  telephone,
} from "./data";

export default function Form({
  crmDetailData,
  params,
}: {
  crmDetailData: UniRefund_CRMService_Merchants_MerchantDto;
  params: {
    id: string;
    data: string;
    lang: string;
  };
}) {
  const [formData] = useState<TableData>(
    dataConfigOfCrm.companies.pages[params.data],
  );
  const router = useRouter();
  const [data, setData] =
    useState<Volo_Abp_Application_Dtos_PagedResultDto_18["items"]>();
  const [IndividualsData, setIdIndividualsData] = useState<Individual[]>();
  const [loading, setLoading] = useState(true);
  const { resources } = useLocale();
  const languageData = getResourceDataClient(resources, params.lang);
  const organizationInfo =
    crmDetailData.entityInformations?.[0]?.organizations?.[0];
  const organizationId = organizationInfo?.id || "";

  const emailInfo = organizationInfo?.contactInformations?.[0]?.emails?.[0];
  const telephoneInfo =
    organizationInfo?.contactInformations?.[0]?.telephones?.[0];
  const addressInfo =
    organizationInfo?.contactInformations?.[0]?.addresses?.[0];

  const organizationSchema = createZodObject(organization, ["name"]);
  const emailSchema = createZodObject(email, ["emailAddress", "typeCode"]);
  const telephoneSchema = createZodObject(telephone, [
    "localNumber",
    "typeCode",
  ]);
  const phoneNumber =
    (telephoneInfo?.ituCountryCode || "+90") +
    (telephoneInfo?.areaCode || "") +
    (telephoneInfo?.localNumber || "");
  const addressSchema = createZodObject(address, [
    "country",
    "terriority",
    "city",
    "postalCode",
    "addressLine",
    "fullAddress",
    "typeCode",
  ]);

  async function handleSubmit(values: unknown, sectionName: string) {
    if (typeof values !== "object") return;

    let response = "fail";
    if (sectionName === "organization") {
      await updateMerchantCRMDetailServer(
        params.id,
        organizationId,
        "merchant",
        values as UniRefund_CRMService_Organizations_UpdateOrganizationDto,
      );
      response = "success";
    }
    if (sectionName === "email") {
      await updateCRMDetailServer(emailInfo?.id || "", {
        ...values,
        primaryFlag: true,
      } as UniRefund_CRMService_EmailCommonDatas_UpdateEmailCommonDataDto);
      response = "success";
    }
    if (sectionName === "telephone") {
      const parsedValues = {
        ...values,
        primaryFlag: true,
      } as UniRefund_CRMService_TelephoneTypes_UpdateTelephoneTypeDto;
      const isValid = isPhoneValid(parsedValues.localNumber);
      if (!isValid) {
        return;
      }
      const phoneData = splitPhone(parsedValues.localNumber);
      await updateCRMDetailServer(telephoneInfo?.id || "", {
        ...values,
        primaryFlag: true,
        ...phoneData,
      } as UniRefund_CRMService_TelephoneTypes_UpdateTelephoneTypeDto);
      response = "success";
    }
    if (sectionName === "address") {
      await updateCRMDetailServer(addressInfo?.id || "", {
        ...values,
        primaryFlag: true,
      } as UniRefund_CRMService_AddressTypes_UpdateAddressTypeDto);
      response = "success";
    }
    if (response) {
      toast.success("Updated successfully!");
    }
  }

  async function getSubCompaniesOfMerchant() {
    setLoading(true);
    try {
      const response = await getSubCompanyByMerchantId({
        id: params.id,
      });
      if (response.type === "error") {
        toast.error(response.status);
        return;
      }
      const _data =
        response.data as Volo_Abp_Application_Dtos_PagedResultDto_18;
      if (_data.items) {
        setData(_data.items);
      }
    } catch (error) {
      toast.error("An error occurred while fetching Sub Companies.");
    } finally {
      setLoading(false);
    }
  }

  async function getIndividualsOfMerchant() {
    setLoading(true);
    try {
      const response = await getIndividualByMerchantId();
      if (response.type === "error") {
        toast.error(response.status);
        return;
      }
      const Individualsdata = response.data as Individual[];
      setIdIndividualsData(Individualsdata);
    } catch (error) {
      toast.error("An error occurred while fetching Individual.");
    } finally {
      setLoading(false);
    }
  }

  async function deleteSubMerchant(id: string) {
    setLoading(true);
    try {
      const response = await deleteSubMerchantByMerchantId({ id });
      if (response.type === "error") {
        toast.error(response.status);
        return;
      }
      toast.success("Sub Company deleted successfully.");
    } catch (error) {
      toast.error("An error occurred while deleting Sub Company.");
    } finally {
      setLoading(false);
    }
  }

  async function deleteIndividualMerchant(id: string) {
    setLoading(true);
    try {
      const response = await deleteIndividualByMerchantId({ id });
      if (response.type === "error") {
        toast.error(response.status);
        return;
      }
      toast.success("Individual deleted successfully.");
    } catch (error) {
      toast.error("An error occurred while deleting Individual.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void getSubCompaniesOfMerchant();
  }, []);

  useEffect(() => {
    void getIndividualsOfMerchant();
  }, []);

  const actionSubCompany: TableAction[] = [
    {
      cta: languageData[
        `${"SubCompany".replaceAll(" ", "")}.New` as keyof typeof languageData
      ],
      type: "NewPage",
      href: `/app/admin/crm/${params.data}/${params.id}/subcompany/new/`,
    },
    {
      cta: `Export CSV`,
      callback: () => {
        jsonToCSV(data, params.data);
      },
      type: "Action",
    },
  ];

  const actionIndividuals: TableAction[] = [
    {
      cta: languageData[
        `${"Individuals".replaceAll(" ", "")}.New` as keyof typeof languageData
      ],
      type: "NewPage",
      href: `/app/admin/crm/${params.data}/${params.id}/individual/new/`,
    },
    {
      cta: `Export CSV`,
      callback: () => {
        jsonToCSV(data, params.data);
      },
      type: "Action",
    },
  ];

  return (
    <div className="h-full overflow-hidden">
      <PageHeader
        LinkElement={Link}
        description={
          languageData[
            `${formData.title?.replaceAll(" ", "")}.Edit` as keyof typeof languageData
          ]
        }
        href={getBaseLink(`/app/admin/crm/${params.data}`)}
        title={
          languageData[
            `${formData.title?.replaceAll(" ", "")}.Edit` as keyof typeof languageData
          ]
        }
      />
      <SectionLayout
        sections={[
          { name: languageData.Organization, id: "organization" },
          { name: languageData.Telephone, id: "telephone" },
          { name: languageData.Address, id: "address" },
          { name: languageData.Email, id: "email" },
          { name: languageData["Sub.Company"], id: "SubCompany" },
          { name: languageData.Individuals, id: "individuals" },
        ]}
        vertical
      >
        <SectionLayoutContent sectionId="organization">
          <AutoForm
            formClassName="pb-40 "
            formSchema={organizationSchema}
            onSubmit={(values) => {
              void handleSubmit(values, "organization");
            }}
            values={{
              name: organizationInfo?.name,
            }}
          >
            <AutoFormSubmit className="float-right">
              {languageData.Save}
            </AutoFormSubmit>
          </AutoForm>
        </SectionLayoutContent>
        <SectionLayoutContent sectionId="telephone">
          <AutoForm
            fieldConfig={{
              localNumber: {
                fieldType: "phone",
                displayName: "Telephone Number",
                inputProps: {
                  showLabel: true,
                },
              },
            }}
            formClassName="pb-40 "
            formSchema={telephoneSchema}
            onSubmit={(values) => {
              void handleSubmit(values, "telephone");
            }}
            values={{
              localNumber: phoneNumber,
              primaryFlag: telephoneInfo?.primaryFlag,
              typeCode:
                telephone.properties.typeCode.enum[
                  telephoneInfo?.typeCode || 0
                ],
            }}
          >
            <AutoFormSubmit className="float-right">
              {languageData.Save}
            </AutoFormSubmit>
          </AutoForm>
        </SectionLayoutContent>
        <SectionLayoutContent sectionId="address">
          <AutoForm
            formClassName="pb-40 "
            formSchema={addressSchema}
            onSubmit={(values) => {
              void handleSubmit(values, "address");
            }}
            values={{
              addressLine: addressInfo?.addressLine,
              city: addressInfo?.city,
              country: addressInfo?.country,
              fullAddress: addressInfo?.fullAddress,
              postalCode: addressInfo?.postalCode,
              terriority: addressInfo?.terriority,
              typeCode:
                address.properties.typeCode.enum[addressInfo?.typeCode || 0],
              primaryFlag: addressInfo?.primaryFlag,
            }}
          >
            <AutoFormSubmit className="float-right">
              {languageData.Save}
            </AutoFormSubmit>
          </AutoForm>
        </SectionLayoutContent>
        <SectionLayoutContent sectionId="email">
          <AutoForm
            fieldConfig={{
              emailAddress: {
                inputProps: {
                  type: "email",
                },
              },
            }}
            formClassName="pb-40 "
            formSchema={emailSchema}
            onSubmit={(values) => {
              void handleSubmit(values, "email");
            }}
            values={{
              emailAddress: emailInfo?.emailAddress,
              typeCode:
                email.properties.typeCode.enum[emailInfo?.typeCode || 0],
              primaryFlag: emailInfo?.primaryFlag,
            }}
          >
            <AutoFormSubmit className="float-right">
              {languageData.Save}
            </AutoFormSubmit>
          </AutoForm>
        </SectionLayoutContent>
        <SectionLayoutContent sectionId="SubCompany">
          <Card className="px-4">
            <DataTable
              action={actionSubCompany}
              columnsData={{
                type: "Auto",
                data: {
                  tableType:
                    dataConfigOfCrm.companies.pages.merchants.tableSchema
                      .schema,
                  excludeList: [
                    "organizationId",
                    "individualId",
                    "parentCompanyId",
                    "id",
                  ],
                  actionList: [
                    {
                      cta: languageData.Delete,
                      type: "Action",
                      callback: (row: { id: string }) => {
                        void deleteSubMerchant(row.id);
                      },
                    },
                    {
                      cta: languageData.Edit,
                      type: "Action",
                      callback: (row: { id: string }) => {
                        router.push(
                          getBaseLink(`app/admin/crm/${params.data}/${row.id}`),
                        );
                      },
                    },
                  ],
                },
              }}
              data={data || []}
              isLoading={loading}
            />
          </Card>
        </SectionLayoutContent>
        <SectionLayoutContent sectionId="individuals">
          <Card className="px-4">
            <DataTable
              action={actionIndividuals}
              columnsData={{
                type: "Auto",
                data: {
                  tableType: individualSchema,
                  excludeList: ["id"],
                  actionList: [
                    {
                      cta: languageData.Delete,
                      type: "Action",
                      callback: (row: { id: string }) => {
                        void deleteIndividualMerchant(row.id);
                      },
                    },
                    {
                      cta: languageData.Edit,
                      type: "Action",
                      callback: () => {
                        ("");
                      },
                    },
                  ],
                },
              }}
              data={IndividualsData || []}
              isLoading={loading}
            />
          </Card>
        </SectionLayoutContent>
      </SectionLayout>
    </div>
  );
}