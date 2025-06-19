import React from 'react';
import { Page, Text, View, Document, StyleSheet, Font, Image } from '@react-pdf/renderer';

// Register fonts
Font.register({
  family: 'Helvetica',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/oswald/v13/Y_TKV6o8WovbUd3m_X9aAA.ttf', fontWeight: 'normal' },
    { src: 'https://fonts.gstatic.com/s/oswald/v13/bH7276GfdCjMjApa_dkG6w.ttf', fontWeight: 'bold' },
  ],
});
Font.register({
    family: 'Helvetica-Oblique',
    src: 'https://fonts.gstatic.com/s/lato/v11/hccPIZHKhL4EMV4K_M7pgg.ttf',
    fontStyle: 'italic'
});


const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#333',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#f0f0f0',
    paddingBottom: 10,
  },
  recipeName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  recipeCode: {
    fontSize: 12,
    color: '#666',
  },
  servings: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#2a2a2a',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingBottom: 5,
  },
  twoColumn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  column: {
    width: '48%',
  },
  ingredientList: {
    marginBottom: 10,
  },
  ingredient: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
    padding: 5,
    borderRadius: 3,
    backgroundColor: '#f9f9f9'
  },
  ingredientName: {
    width: '70%',
  },
  ingredientQty: {
    width: '30%',
    textAlign: 'right'
  },
  instructions: {
    lineHeight: 1.5,
  },
  notes: {
    fontFamily: 'Helvetica-Oblique',
    fontSize: 9,
    color: '#555',
    backgroundColor: '#f9f9f9',
    padding: 10,
    borderRadius: 4,
  },
  costSummary: {
    marginTop: 20,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  costItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  costLabel: {},
  costValue: {
    fontWeight: 'bold',
  },
  allergySummary: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#fffbe6',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#ffe58f',
  },
  allergyTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#d46b08',
  },
  allergyList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  allergyTag: {
    margin: 2,
    padding: 4,
    borderRadius: 3,
    fontSize: 9,
  },
  containsTag: {
    backgroundColor: '#ffccc7',
    color: '#a8071a',
  },
  mayContainTag: {
    backgroundColor: '#ffe58f',
    color: '#ad6800',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    textAlign: 'center',
    fontSize: 8,
    color: '#999',
  },
  photo: {
      width: '100%',
      maxHeight: 200,
      objectFit: 'cover',
      borderRadius: 4,
      marginBottom: 20
  }
});

const parseAllergies = (allergies: any) => {
    if (!allergies) return [];
    try {
        const parsed = typeof allergies === 'string' ? JSON.parse(allergies) : allergies;
        return Array.isArray(parsed) ? parsed.map(a => {
            if (typeof a === 'string') {
                const [name, status] = a.split(':');
                return { name: name.trim(), status: (status?.trim() || 'has') };
            }
            if (typeof a === 'object' && a.allergy) {
                return { name: a.allergy, status: a.status || 'has' };
            }
            return null;
        }).filter(Boolean) : [];
    } catch {
        return [];
    }
};

const RecipePDF = ({ recipe }: { recipe: any }) => {
  const allergySummary = recipe.ingredients.reduce((acc: Map<string, 'has' | 'may'>, ingredient: any) => {
    const allergies = parseAllergies(ingredient.ingredientAllergies);
    allergies.forEach(allergy => {
      if (allergy && allergy.name) {
          const existing = acc.get(allergy.name);
          if (!existing || (existing === 'may' && allergy.status === 'has')) {
              acc.set(allergy.name, allergy.status);
          }
      }
    });
    return acc;
  }, new Map<string, 'has' | 'may'>());

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
            <View>
                <Text style={styles.recipeName}>{recipe.name}</Text>
                {recipe.code && <Text style={styles.recipeCode}>Code: {recipe.code}</Text>}
                <Text style={styles.servings}>Serves: {recipe.servings}</Text>
            </View>
        </View>

        {recipe.photo && <Image src={recipe.photo} style={styles.photo} />}
        
        {allergySummary.size > 0 && (
          <View style={styles.allergySummary}>
            <Text style={styles.allergyTitle}>Allergy Information</Text>
            <View style={styles.allergyList}>
              {(Array.from(allergySummary.entries()) as [string, 'has' | 'may'][]).map(([name, status]) => (
                <Text key={name} style={[
                  styles.allergyTag,
                  status === 'has' ? styles.containsTag : styles.mayContainTag
                ]}>
                  {status === 'has' ? 'Contains' : 'May Contain'} {name}
                </Text>
              ))}
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ingredients</Text>
          <View style={styles.ingredientList}>
            {recipe.ingredients.map((ing: any, index: number) => (
              <View key={index} style={styles.ingredient}>
                <Text style={styles.ingredientName}>{ing.ingredientName}</Text>
                <Text style={styles.ingredientQty}>{`${ing.quantity} ${ing.unit || ''}`}</Text>
              </View>
            ))}
          </View>
        </View>

        {recipe.instructions && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Instructions</Text>
            <Text style={styles.instructions}>{recipe.instructions}</Text>
          </View>
        )}
        
        {recipe.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <Text style={styles.notes}>{recipe.notes}</Text>
          </View>
        )}

        <View style={styles.costSummary}>
            <View style={styles.costItem}>
                <Text style={styles.costLabel}>Total Cost:</Text>
                <Text style={styles.costValue}>£{Number(recipe.totalCost || 0).toFixed(2)}</Text>
            </View>
            <View style={styles.costItem}>
                <Text style={styles.costLabel}>Cost Per Serving:</Text>
                <Text style={styles.costValue}>£{Number(recipe.costPerServing || 0).toFixed(2)}</Text>
            </View>
        </View>
        
        <Text style={styles.footer} fixed>
            Generated on {new Date().toLocaleDateString('en-GB')}
        </Text>
      </Page>
    </Document>
  );
};

export default RecipePDF; 