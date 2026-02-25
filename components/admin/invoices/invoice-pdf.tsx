
import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image, Font } from '@react-pdf/renderer';
import { Invoice } from '@/hooks/use-invoices-store';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// Register fonts if needed, otherwise use standard fonts
// Font.register({ family: 'Inter', src: '...' });

const styles = StyleSheet.create({
    page: {
        flexDirection: 'column',
        backgroundColor: '#FFFFFF',
        padding: 30, // Increased padding for better breathing room
        fontFamily: 'Helvetica',
        fontSize: 9,
        color: '#334155',
    },
    // Header
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
        paddingBottom: 20,
    },
    logoSection: {
        flexDirection: 'column',
        justifyContent: 'center',
    },
    companyName: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#0F172A',
        letterSpacing: -0.5,
    },
    companyDetails: {
        fontSize: 9,
        color: '#64748B',
        marginTop: 4,
    },
    invoiceDetails: {
        alignItems: 'flex-end',
        justifyContent: 'center',
    },
    title: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#64748B',
        letterSpacing: 2, // Spaced out uppercase
        marginBottom: 4,
        textTransform: 'uppercase',
    },
    id: {
        fontSize: 14,
        color: '#0F172A',
        fontWeight: 'bold',
    },
    invoiceName: {
        fontSize: 10,
        color: '#64748B',
        marginTop: 4,
    },

    // Info Section (Grid-like)
    section: {
        flexDirection: 'row',
        justifyContent: 'flex-start', // Use gap simulation
        marginBottom: 25,
    },
    infoColumn: {
        flexDirection: 'column',
        marginRight: 40, // Fixed spacing between columns
    },
    label: {
        fontSize: 8,
        color: '#94A3B8',
        marginBottom: 4,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    value: {
        fontSize: 10,
        color: '#0F172A',
        fontWeight: 'medium',
    },

    // Table
    table: {
        flexDirection: 'column', // Changed from display: 'flex' for clarity
        width: '100%',
        marginBottom: 20,
    },
    tableHeaderRow: {
        flexDirection: 'row',
        backgroundColor: '#0F172A', // Dark background for contrast
        paddingVertical: 8,
        paddingHorizontal: 8, // Add padding inside the dark bar
        marginBottom: 8,
        borderRadius: 4, // Slight rounding for modern feel
        alignItems: 'center',
    },
    tableRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9', // Subtle separator
        paddingVertical: 8, // More breathing room
        alignItems: 'center',
    },
    // Table Columns - Using flex instead of fixed width percentages for better distribution?
    // PDF renderer usually needs widths.
    colDesc: { width: '50%' },
    colQty: { width: '10%', textAlign: 'right' },
    colPrice: { width: '20%', textAlign: 'right' },
    colTotal: { width: '20%', textAlign: 'right' },

    // Cell Styles
    headerCell: {
        fontSize: 8,
        fontWeight: 'bold',
        color: '#FFFFFF', // White text on dark background
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    cell: {
        fontSize: 9,
        color: '#334155',
    },
    cellBold: {
        fontSize: 9,
        fontWeight: 'bold',
        color: '#0F172A',
    },

    // Totals
    totalsSection: {
        flexDirection: 'column',
        alignItems: 'flex-end',
        marginTop: 10,
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginBottom: 6,
    },
    totalLabel: {
        fontSize: 9,
        color: '#64748B',
        marginRight: 20,
        textAlign: 'right',
        width: 100,
    },
    totalValue: {
        fontSize: 9,
        color: '#0F172A',
        width: 120,
        textAlign: 'right',
        fontFamily: 'Helvetica-Bold', // Ensure bold
    },
    finalTotalRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginTop: 10,
        paddingTop: 10,
        borderTopWidth: 2, // Thicker border
        borderTopColor: '#0F172A', // Dark accent
    },
    finalTotalLabel: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#0F172A',
        marginRight: 20,
        textAlign: 'right',
        width: 100,
        textTransform: 'uppercase',
    },
    finalTotalValue: {
        fontSize: 16, // Larger
        fontWeight: 'bold',
        color: '#0F172A',
        width: 150,
        textAlign: 'right',
    },

    // Notes
    notesSection: {
        marginTop: 40,
        paddingTop: 20,
        borderTopWidth: 1,
        borderTopColor: '#E2E8F0',
    },
});

interface InvoicePDFProps {
    invoice: Invoice;
    settings?: {
        companyName: string
        companyEmail: string
        companyPhone: string
        companyAddress: string
        companyLogo: string | null
    }
}

export const InvoicePDF = ({ invoice, settings }: InvoicePDFProps) => {
    const currency = invoice.currency || 'USD';
    const symbol = currency === 'USD' ? '$' : 'CUP';

    const subtotal = invoice.subtotal;
    // Calculate total discount if needed, or rely on invoice properties
    // Invoice store has subtotal, tax, total.
    // Explicit discount fields are optional in Invoice interface: discountType, discountValue.

    // Calculate discount amount for display if not explicitly stored as a total
    let discountAmount = 0;
    if (invoice.discountType && invoice.discountValue) {
        if (invoice.discountType === 'PERCENTAGE') {
            discountAmount = subtotal * (invoice.discountValue / 100);
        } else if (invoice.discountType === 'FIXED') {
            discountAmount = invoice.discountValue;
        } else if (invoice.discountType === 'TARGET_PRICE') {
            discountAmount = Math.max(0, subtotal - invoice.discountValue);
        }
    }

    // Verify if subtotal - discount matches total (ignoring tax for now as it was removed)
    // Or just use the calculated discountAmount

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.logoSection}>
                        {settings?.companyLogo ? (
                            // eslint-disable-next-line jsx-a11y/alt-text
                            <Image src={settings.companyLogo} style={{ width: 100, height: 50, objectFit: 'contain', marginBottom: 5 }} />
                        ) : (
                            <Text style={styles.companyName}>{settings?.companyName || "Oduba Solar"}</Text>
                        )}
                        <Text style={styles.companyDetails}>{settings?.companyAddress || "Calle Principal #123, La Habana"}</Text>
                        <Text style={styles.companyDetails}>{settings?.companyEmail || "contacto@odubasolar.com"} | {settings?.companyPhone || "+53 52345678"}</Text>
                    </View>
                    <View style={styles.invoiceDetails}>
                        <Text style={styles.title}>FACTURA</Text>
                        <Text style={styles.id}>#{invoice.id}</Text>
                        {/* Invoices don't typically have a name like budgets, but we can check if there's one */}
                    </View>
                </View>

                {/* Info Section */}
                <View style={styles.section}>
                    <View style={styles.infoColumn}>
                        <Text style={styles.label}>CLIENTE</Text>
                        <Text style={styles.value}>{invoice.customerName || 'Cliente General'}</Text>
                    </View>
                    <View style={styles.infoColumn}>
                        <Text style={styles.label}>FECHA</Text>
                        <Text style={styles.value}>{format(new Date(invoice.date), 'dd/MM/yyyy')}</Text>
                    </View>
                    <View style={styles.infoColumn}>
                        <Text style={styles.label}>MONEDA</Text>
                        <Text style={styles.value}>{invoice.currency === 'USD' ? 'Dólares (USD)' : 'Pesos Cubanos (CUP)'}</Text>
                    </View>

                </View>

                {/* Items Table */}
                <View style={styles.table}>
                    {/* Header Row */}
                    <View style={styles.tableHeaderRow}>
                        <View style={styles.colDesc}>
                            <Text style={styles.headerCell}>PRODUCTO / SERVICIO</Text>
                        </View>
                        <View style={styles.colQty}>
                            <Text style={styles.headerCell}>CANTIDAD</Text>
                        </View>
                        <View style={styles.colPrice}>
                            <Text style={styles.headerCell}>PRECIO</Text>
                        </View>
                        <View style={styles.colTotal}>
                            <Text style={styles.headerCell}>TOTAL</Text>
                        </View>
                    </View>

                    {/* Rows */}
                    {invoice.items.map((item, index) => (
                        <View style={[styles.tableRow, {
                            paddingHorizontal: 8
                        }]} key={index}>
                            <View style={styles.colDesc}>
                                <Text style={styles.cellBold}>{item.productName}</Text>
                            </View>
                            <View style={styles.colQty}>
                                <Text style={styles.cell}>{item.quantity}</Text>
                            </View>
                            <View style={styles.colPrice}>
                                <Text style={styles.cell}>{symbol} {item.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}</Text>
                            </View>
                            <View style={styles.colTotal}>
                                <Text style={styles.cell}>{symbol} {(item.quantity * item.price).toLocaleString('en-US', { minimumFractionDigits: 2 })}</Text>
                            </View>
                        </View>
                    ))}
                </View>

                {/* Totals */}
                <View style={styles.totalsSection}>
                    <View style={styles.totalRow}>
                        <Text style={styles.totalLabel}>Subtotal</Text>
                        <Text style={styles.totalValue}>{symbol} {subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</Text>
                    </View>

                    {discountAmount > 0 && (
                        <View style={styles.totalRow}>
                            <Text style={styles.totalLabel}>Descuento</Text>
                            <Text style={{ ...styles.totalValue, color: '#10B981' }}>- {symbol} {discountAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</Text>
                        </View>
                    )}


                    <View style={styles.finalTotalRow}>
                        <Text style={styles.finalTotalLabel}>TOTAL</Text>
                        <Text style={styles.finalTotalValue}>{symbol} {invoice.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}</Text>
                    </View>

                    {/* Payments and Balance - Only show if there are payments */}
                    {(invoice.payments && invoice.payments.length > 0) && (() => {
                        const totalPaid = invoice.payments.reduce((sum, p) => sum + p.amount, 0);
                        const balanceDue = invoice.total - totalPaid;

                        return (
                            <>
                                <View style={{ ...styles.totalRow, marginTop: 10 }}>
                                    <Text style={{ ...styles.totalLabel, color: '#64748B' }}>Pago realizado</Text>
                                    <Text style={{ ...styles.totalValue, color: '#EF4444' }}>(-) {symbol} {totalPaid.toLocaleString('en-US', { minimumFractionDigits: 2 })}</Text>
                                </View>
                                <View style={{ ...styles.totalRow, backgroundColor: '#F8FAFC', paddingVertical: 4, paddingHorizontal: 0, marginTop: 4 }}>
                                    <Text style={{ ...styles.totalLabel, fontWeight: 'bold', color: '#0F172A' }}>Saldo adeudado</Text>
                                    <Text style={{ ...styles.totalValue, fontWeight: 'bold', color: '#0F172A' }}>{symbol} {Math.max(0, balanceDue).toLocaleString('en-US', { minimumFractionDigits: 2 })}</Text>
                                </View>
                            </>
                        );
                    })()}
                </View>

                {/* Notes */}
                {invoice.notes && (
                    <View style={styles.notesSection}>
                        <Text style={styles.label}>NOTAS</Text>
                        <Text style={{ fontSize: 9, color: '#334155', marginTop: 4, lineHeight: 1.4 }}>{invoice.notes}</Text>
                    </View>
                )}
            </Page>
        </Document>
    );
};
