import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Form, FormInstance, Modal } from 'antd';
import PaletteOutlinedIcon from '@mui/icons-material/PaletteOutlined';
import { useTranslation } from 'react-i18next';
import { appURL } from '../../../../../appConfig';
import { CardEditable } from '../../../../CardEditable';
import { MuiColorField } from '../../../../mui/MuiColorField';
import { SideScrollerFooter } from '../../../../SideScrollerFooter';
import { useAppConfigContext } from '../../../../../context/useAppConfig';
import { usePublicTenantData } from '../../../../../hooks/usePublicTenantData.hook';
import { useTenantAppearanceFormData } from '../../../../../hooks/useTenantAppearanceFormData';
import { isReadOnlySetting } from '../../../../../utils/serverSettingsMeta';
import { computeOrisoPalette } from '../../../../../utils/theme/orisoScheme';
import { brandSeedCannotYieldPalette } from '../../../../../utils/theme/seedUsability';
import {
    buildSeedUpdate,
    getAccentDark,
    getAccentLight,
    getSignal,
    readSeeds,
    TenantSeeds,
} from '../../../../../utils/themeSeeds';
import iphoneFrame from '../../../../../resources/img/theme-preview/iphone-14-pro.png';
import { buildPreviewUrl } from './previewUrl';
import styles from './styles.module.scss';

interface ThemeBuilderProps {
    tenantId: string;
    readOnly?: boolean;
}

interface ThemeBuilderFormProps {
    form: FormInstance;
    storedSeeds: TenantSeeds;
    locks: { accentDark: boolean; accentLight: boolean; signal: boolean };
    editing: boolean;
    saveRejected?: boolean;
}

interface ThemeEditorModalProps {
    open: boolean;
    initialValues: Record<string, unknown>;
    storedSeeds: TenantSeeds;
    locks: { accentDark: boolean; accentLight: boolean; signal: boolean };
    onCancel: () => void;
    onSubmit: (values: any) => void;
    /**
     * Origin serving the end-user app. Defaults to configured `appURL`.
     * Stories and unit tests MUST pass a stub so they never hit the network.
     */
    appBaseUrl?: string;
}

const seedIsTooPale = (seeds: TenantSeeds): boolean => {
    const accentDark = getAccentDark(seeds);
    return Boolean(accentDark && brandSeedCannotYieldPalette(accentDark));
};

const seedSignalTooClose = (seeds: TenantSeeds): boolean => {
    if (!getSignal(seeds) || !getAccentDark(seeds)) {
        return false;
    }
    return computeOrisoPalette(seeds).signalTooClose;
};

const SCROLL_EPSILON = 8;

const getThemeRows = (tokens: Record<string, string>, t: (key: string) => string) => [
    {
        color: tokens['--oriso-app-accent-dark'],
        label: t('theme.builder.accentDarkColor'),
        description: t('theme.builder.summary.accentDark'),
    },
    {
        color: tokens['--oriso-app-accent-light'],
        label: t('theme.builder.accentLightColor'),
        description: t('theme.builder.summary.accentLight'),
    },
    {
        color: tokens['--m3-error'],
        label: t('theme.builder.summary.errorLabel'),
        description: t('theme.builder.summary.error'),
    },
];

const ColorSummaryRow = ({ color, label, description }: { color: string; label: string; description: string }) => (
    <div className={styles.colorSummaryRow}>
        <span className={styles.colorSwatch} style={{ backgroundColor: color }} />
        <span className={styles.colorText}>
            <span className={styles.colorDescription}>{description}</span>
            <span className={styles.colorLabel}>{label}</span>
        </span>
    </div>
);

const ThemeSummary = ({ seeds }: { seeds: TenantSeeds }) => {
    const { t } = useTranslation();
    const { tokens } = computeOrisoPalette(seeds);
    const rows = getThemeRows(tokens, t);

    return (
        <div className={styles.colorSummary}>
            {rows.map((row) => (
                <ColorSummaryRow {...row} key={row.label} />
            ))}
        </div>
    );
};

const ThemeBuilderForm = ({ form, storedSeeds, locks, editing, saveRejected = false }: ThemeBuilderFormProps) => {
    const { t } = useTranslation();
    const accentDark = Form.useWatch(['theming', 'primaryColor'], form);
    const accentLight = Form.useWatch(['theming', 'accent'], form);
    const signal = Form.useWatch(['theming', 'signal'], form);
    const draftSeeds: TenantSeeds = {
        accentDark: accentDark ?? getAccentDark(storedSeeds),
        accentLight: accentLight ?? getAccentLight(storedSeeds),
        signal: signal ?? getSignal(storedSeeds),
    };
    const tooPale = seedIsTooPale(draftSeeds);
    const signalTooClose = seedSignalTooClose(draftSeeds);
    const unusableSeedMessage = t('theme.builder.seedUnusable');

    if (!editing) {
        return <ThemeSummary seeds={storedSeeds} />;
    }

    return (
        <>
            <div className={styles.colorEditor}>
                <MuiColorField
                    className={styles.colorField}
                    labelKey="theme.builder.accentDarkColor"
                    name={['theming', 'primaryColor']}
                    required
                    disabled={locks.accentDark}
                    rules={[
                        {
                            validator: async (_, value) => {
                                if (value && brandSeedCannotYieldPalette(value)) {
                                    return Promise.reject(new Error(unusableSeedMessage));
                                }
                                return Promise.resolve();
                            },
                        },
                    ]}
                />
                <MuiColorField
                    className={styles.colorField}
                    labelKey="theme.builder.accentLightColor"
                    name={['theming', 'accent']}
                    disabled={locks.accentLight}
                />
                <MuiColorField
                    className={styles.colorField}
                    labelKey="theme.builder.signalColor"
                    name={['theming', 'signal']}
                    disabled={locks.signal}
                />
            </div>
            {saveRejected && tooPale && (
                <Alert className={styles.tooPaleAlert} type="error" showIcon message={unusableSeedMessage} />
            )}
            {tooPale && !saveRejected && (
                <Alert className={styles.tooPaleAlert} type="warning" showIcon message={t('theme.builder.tooPale')} />
            )}
            {signalTooClose && (
                <Alert
                    className={styles.tooPaleAlert}
                    type="warning"
                    showIcon
                    message={t('theme.builder.signalTooClose')}
                />
            )}
        </>
    );
};

// The configured app host, or nothing: the mock-up must not show a host this environment does not
// serve (ORISO-Helm#368).
const previewHost = (appBaseUrl: string): string => {
    try {
        return new URL(appBaseUrl).host;
    } catch {
        return '';
    }
};

const PhoneThemePreview = ({
    labelKey,
    seeds,
    appBaseUrl = appURL,
}: {
    labelKey: string;
    seeds: TenantSeeds;
    appBaseUrl?: string;
}) => {
    const { t } = useTranslation();
    const url = buildPreviewUrl(appBaseUrl, seeds);

    return (
        <figure className={styles.phonePreview}>
            <figcaption className={styles.phonePreviewLabel}>{t(labelKey)}</figcaption>
            <div className={styles.phoneFrame}>
                <div className={styles.phoneScreen}>
                    {url ? (
                        <div className={styles.frameWrap}>
                            {/* No CSP frame-ancestors on the app today; recommended
                                in ORISO-Frontend#144 if embedding constraints are
                                added later. Do not invent a CSP in this repo. */}
                            <iframe
                                key={url}
                                className={styles.frame}
                                src={url}
                                title={t('theme.builder.preview.frameTitle')}
                                data-testid="preview-frame"
                                sandbox="allow-scripts allow-same-origin"
                                tabIndex={-1}
                            />
                            <div className={styles.frameShield} data-testid="preview-frame-shield" />
                        </div>
                    ) : (
                        <div className={styles.frameEmpty}>{t('theme.builder.preview.empty')}</div>
                    )}
                </div>
                <img className={styles.phoneFrameImage} src={iphoneFrame} alt="" aria-hidden="true" />
                <span className={styles.phoneAddressText} aria-hidden="true" data-testid="preview-address">
                    {previewHost(appBaseUrl)}
                </span>
            </div>
        </figure>
    );
};

export const ThemeEditorModal = ({
    open,
    initialValues,
    storedSeeds,
    locks,
    onCancel,
    onSubmit,
    appBaseUrl = appURL,
}: ThemeEditorModalProps) => {
    const { t } = useTranslation();
    const [form] = Form.useForm();
    const [saveRejected, setSaveRejected] = useState(false);
    const previewScrollerRef = useRef<HTMLDivElement>(null);
    const [previewScrollState, setPreviewScrollState] = useState({
        canScrollBackward: false,
        canScrollForward: false,
    });
    const accentDark = Form.useWatch(['theming', 'primaryColor'], form);
    const accentLight = Form.useWatch(['theming', 'accent'], form);
    const signal = Form.useWatch(['theming', 'signal'], form);
    const draftSeeds: TenantSeeds = {
        accentDark: accentDark ?? getAccentDark(storedSeeds),
        accentLight: accentLight ?? getAccentLight(storedSeeds),
        signal: signal ?? getSignal(storedSeeds),
    };

    useEffect(() => {
        if (open) {
            form.setFieldsValue(initialValues);
            setSaveRejected(false);
        }
    }, [form, initialValues, open]);

    const handleFinish = (values: { theming?: { primaryColor?: string; accent?: string } }) => {
        if (brandSeedCannotYieldPalette(values.theming?.primaryColor)) {
            setSaveRejected(true);
            form.setFields([
                {
                    name: ['theming', 'primaryColor'],
                    errors: [t('theme.builder.seedUnusable')],
                },
            ]);
            return;
        }

        setSaveRejected(false);
        onSubmit(values);
    };

    const handleFinishFailed = () => {
        if (brandSeedCannotYieldPalette(form.getFieldValue(['theming', 'primaryColor']))) {
            setSaveRejected(true);
        }
    };

    useEffect(() => {
        if (!brandSeedCannotYieldPalette(accentDark)) {
            setSaveRejected(false);
        }
    }, [accentDark]);

    const updatePreviewScrollState = useCallback(() => {
        const previewScroller = previewScrollerRef.current;

        if (!previewScroller) {
            return;
        }

        const maxScrollLeft = previewScroller.scrollWidth - previewScroller.clientWidth;
        setPreviewScrollState({
            canScrollBackward: previewScroller.scrollLeft > SCROLL_EPSILON,
            canScrollForward: previewScroller.scrollLeft < maxScrollLeft - SCROLL_EPSILON,
        });
    }, []);

    const scrollPreview = (direction: -1 | 1) => {
        const previewScroller = previewScrollerRef.current;

        if (!previewScroller) {
            return;
        }

        previewScroller.scrollBy({
            left: direction * Math.min(previewScroller.clientWidth * 0.82, 520),
            behavior: 'smooth',
        });
    };

    useEffect(() => {
        let previewScroller: HTMLDivElement | null = null;
        let frameId: number | undefined;
        let timeoutId: number | undefined;
        let intervalId: number | undefined;
        let resizeObserver: ResizeObserver | undefined;

        if (!open) {
            return undefined;
        }

        const bindPreviewScroller = () => {
            previewScroller = previewScrollerRef.current;

            if (!previewScroller) {
                frameId = window.requestAnimationFrame(bindPreviewScroller);
                return;
            }

            updatePreviewScrollState();
            timeoutId = window.setTimeout(updatePreviewScrollState, 0);
            intervalId = window.setInterval(updatePreviewScrollState, 250);
            resizeObserver =
                typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updatePreviewScrollState) : undefined;

            resizeObserver?.observe(previewScroller);
            previewScroller.addEventListener('scroll', updatePreviewScrollState, { passive: true });
            window.addEventListener('resize', updatePreviewScrollState);
        };

        bindPreviewScroller();

        return () => {
            if (frameId) {
                window.cancelAnimationFrame(frameId);
            }

            if (timeoutId) {
                window.clearTimeout(timeoutId);
            }

            if (intervalId) {
                window.clearInterval(intervalId);
            }

            resizeObserver?.disconnect();

            if (previewScroller) {
                previewScroller.removeEventListener('scroll', updatePreviewScrollState);
            }

            window.removeEventListener('resize', updatePreviewScrollState);
        };
    }, [open, updatePreviewScrollState]);

    return (
        <Modal
            open={open}
            footer={null}
            closable={false}
            destroyOnClose
            width="100vw"
            className={styles.themeFullscreenModal}
            wrapClassName={styles.themeFullscreenModalWrap}
            onCancel={onCancel}
        >
            <Form
                validateTrigger={['onSubmit', 'onChange']}
                labelAlign="left"
                labelWrap
                layout="vertical"
                form={form}
                size="large"
                initialValues={initialValues}
                onFinish={handleFinish}
                onFinishFailed={handleFinishFailed}
                className={styles.themeEditorForm}
            >
                <div className={styles.themeEditorShell}>
                    <aside className={styles.themeEditorPanel}>
                        <div className={styles.themeEditorIntro}>
                            <PaletteOutlinedIcon />
                            <h2>{t('settings.colors')}</h2>
                            <p>{t('settings.colors.howto')}</p>
                        </div>
                        <ThemeBuilderForm
                            form={form}
                            storedSeeds={storedSeeds}
                            locks={locks}
                            editing
                            saveRejected={saveRejected}
                        />
                        <div className={styles.themeEditorActions}>
                            <button className={styles.themeTextButton} type="button" onClick={onCancel}>
                                {t('card.edit.cancel')}
                            </button>
                            <button className={styles.themeTextButton} type="submit">
                                {t('card.edit.save')}
                            </button>
                        </div>
                    </aside>
                    <div className={styles.themePreviewRegion}>
                        {/* Focusable scroll region: keyboard users must reach the panel
                            to pan between phones when it still overflows (axe:
                            scrollable-region-focusable). */}
                        {/* eslint-disable jsx-a11y/no-noninteractive-tabindex */}
                        <section
                            className={styles.themePreviewPanel}
                            ref={previewScrollerRef}
                            tabIndex={0}
                            aria-label={t('settings.colors')}
                        >
                            <PhoneThemePreview
                                labelKey="theme.builder.preview.current"
                                seeds={storedSeeds}
                                appBaseUrl={appBaseUrl}
                            />
                            <PhoneThemePreview
                                labelKey="theme.builder.preview.new"
                                seeds={draftSeeds}
                                appBaseUrl={appBaseUrl}
                            />
                        </section>
                        {/* eslint-enable jsx-a11y/no-noninteractive-tabindex */}
                        <SideScrollerFooter
                            className={styles.themePreviewScrollerFooter}
                            ariaLabel={t('theme.builder.preview.scroll')}
                            previousLabel={t('theme.builder.preview.previous')}
                            nextLabel={t('theme.builder.preview.next')}
                            canScrollBackward={previewScrollState.canScrollBackward}
                            canScrollForward={previewScrollState.canScrollForward}
                            onScrollBackward={() => scrollPreview(-1)}
                            onScrollForward={() => scrollPreview(1)}
                        />
                    </div>
                </div>
            </Form>
        </Modal>
    );
};

export const ThemeBuilder = ({ tenantId, readOnly = false }: ThemeBuilderProps) => {
    const { t } = useTranslation();
    const [editorOpen, setEditorOpen] = useState(false);
    const { settings } = useAppConfigContext();
    const { data, isLoading, mutate } = useTenantAppearanceFormData(tenantId);
    const { data: inheritedData } = usePublicTenantData();

    const locks = {
        accentDark:
            readOnly ||
            isReadOnlySetting(settings.serverSettingsMeta, [
                'primaryColor',
                'theming.primaryColor',
                'tenantPrimaryColor',
                'tenantThemingPrimaryColor',
                'brandingPrimaryColor',
            ]),
        accentLight:
            readOnly ||
            isReadOnlySetting(settings.serverSettingsMeta, ['accent', 'theming.accent', 'brandingAccentColor']),
        signal:
            readOnly ||
            isReadOnlySetting(settings.serverSettingsMeta, ['signal', 'theming.signal', 'brandingSignalColor']),
    };
    const storedSeeds = readSeeds(data?.theming);
    const inheritedSeeds = readSeeds(inheritedData?.theming);
    const effectiveAccentDark = getAccentDark(storedSeeds) || getAccentDark(inheritedSeeds);
    const effectiveAccentLight = getAccentLight(storedSeeds) || getAccentLight(inheritedSeeds);
    const effectiveSignal = getSignal(storedSeeds) || getSignal(inheritedSeeds);
    const effectiveSeeds: TenantSeeds = {
        accentDark: effectiveAccentDark,
        accentLight: effectiveAccentLight,
        signal: effectiveSignal,
        primary: effectiveAccentDark,
        accent: effectiveAccentLight,
    };
    const { tokens } = computeOrisoPalette(effectiveSeeds);
    const initialValues = {
        theming: {
            primaryColor: effectiveAccentDark ?? tokens['--oriso-app-accent-dark'],
            accent: effectiveAccentLight ?? tokens['--oriso-app-accent-light'],
            signal: effectiveSignal ?? tokens['--m3-error'],
        },
    };
    const onSubmit = (values) => {
        mutate({
            theming: buildSeedUpdate({
                accentDark: values.theming?.primaryColor,
                accentLight: values.theming?.accent,
                signal: values.theming?.signal,
            }),
        });
        setEditorOpen(false);
    };
    const canEdit = !(locks.accentDark && locks.accentLight && locks.signal);

    return (
        <>
            <CardEditable
                key={`theme-builder-${effectiveAccentDark}-${effectiveAccentLight}-${effectiveSignal}-${locks.accentDark}-${locks.accentLight}-${locks.signal}`}
                allowEdit={canEdit}
                isLoading={isLoading}
                titleKey="settings.colors"
                subTitle={t<string>('settings.colors.howto')}
                onEdit={() => setEditorOpen(true)}
                onSave={() => undefined}
                variant="dialog"
                editButtonPlacement="footer"
                headerIcon={<PaletteOutlinedIcon />}
            >
                <ThemeSummary seeds={effectiveSeeds} />
            </CardEditable>
            {canEdit && (
                <ThemeEditorModal
                    open={editorOpen}
                    initialValues={initialValues}
                    storedSeeds={effectiveSeeds}
                    locks={locks}
                    onCancel={() => setEditorOpen(false)}
                    onSubmit={onSubmit}
                />
            )}
        </>
    );
};
